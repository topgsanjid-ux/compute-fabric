"""
bench.py
Measures the performance overhead of running the high-frequency GPU telemetry
collector at different sampling frequencies (1 Hz, 10 Hz, 100 Hz, 1000 Hz)
against an isolated PyTorch GPU compute baseline.
"""

import threading
import time
from typing import Dict, List, Tuple
import matplotlib.pyplot as plt
import numpy as np
import torch

from febric.collector import init_nvml_gpu, get_gpu_reading


def run_gpu_workload(duration_sec: float = 60.0, matrix_size: int = 4096) -> int:
    """
    Executes heavy GPU matrix multiplications in a loop and counts the completed
    iterations within the specified duration. Uses torch.cuda.synchronize()
    to ensure accurate asynchronous CUDA kernel timing.
    """
    if not torch.cuda.is_available():
        raise RuntimeError("PyTorch with CUDA support is required to run the GPU benchmark.")

    device = torch.device("cuda:0")

    # Allocate matrices on GPU
    a = torch.randn(matrix_size, matrix_size, device=device, dtype=torch.float32)
    b = torch.randn(matrix_size, matrix_size, device=device, dtype=torch.float32)

    # Warm-up pass to populate CUDA driver context and compile kernel caches
    for _ in range(5):
        c = torch.matmul(a, b)
    torch.cuda.synchronize()

    iterations = 0
    start_time = time.perf_counter()

    while True:
        # Check elapsed time
        if time.perf_counter() - start_time >= duration_sec:
            break

        c = torch.matmul(a, b)
        torch.cuda.synchronize()
        iterations += 1

    return iterations


def _background_collector_worker(handle, stop_event: threading.Event, frequency_hz: float):
    """Worker function that polls NVML at the requested frequency until stopped."""
    interval = 1.0 / frequency_hz
    next_tick = time.perf_counter()

    while not stop_event.is_set():
        _ = get_gpu_reading(handle)

        next_tick += interval
        remaining = next_tick - time.perf_counter()
        if remaining > 0:
            time.sleep(remaining)
        else:
            next_tick = time.perf_counter()


def run_benchmark_suite(
    duration_per_run: float = 60.0,
    frequencies: List[int] = [1, 10, 100, 1000],
    repeats: int = 3,
    output_chart_file: str = "collector_overhead_benchmark.png"
) -> Dict[str, Any]:
    """
    Runs the complete benchmark suite:
    1. Measures baseline (no collector) with consistency validation.
    2. Measures workload with background collector running at each target frequency (3 runs each).
    3. Calculates percentage slowdown against baseline.
    4. Plots and saves overhead chart.
    """
    print("=" * 65)
    print("      COMPUTE-FABRIC: HIGH-FREQUENCY COLLECTOR BENCHMARK")
    print("=" * 65)

    handle = init_nvml_gpu()

    # --- Phase 1: Baseline Consistency Check ---
    print(f"\n[PHASE 1] Measuring baseline workload ({repeats} runs of {duration_per_run}s each)...")
    baseline_runs: List[int] = []
    for run_idx in range(1, repeats + 1):
        print(f"  -> Running Baseline #{run_idx}...", end="", flush=True)
        iters = run_gpu_workload(duration_sec=duration_per_run)
        baseline_runs.append(iters)
        print(f" Completed {iters} iterations.")

    baseline_mean = float(np.mean(baseline_runs))
    baseline_std = float(np.std(baseline_runs))
    cv_percent = (baseline_std / baseline_mean) * 100.0

    print(f"\n[BASELINE STATS] Mean: {baseline_mean:.1f} iters | StdDev: {baseline_std:.1f} | Variation (CV): {cv_percent:.2f}%")

    # Safety assertion: baseline must not vary wildly (> 5%)
    if cv_percent > 5.0:
        print("[WARNING] Baseline variation exceeds 5%! Consider increasing duration or closing background tasks.")
    else:
        print("[CHECK PASSED] Baseline is stable and consistent within acceptable bounds.")

    # --- Phase 2: Frequency Overhead Tests ---
    print(f"\n[PHASE 2] Measuring collector impact at {frequencies} Hz ({repeats} runs each)...")
    results_by_freq: Dict[int, List[int]] = {}
    mean_slowdowns: Dict[int, float] = {}

    for freq in frequencies:
        results_by_freq[freq] = []
        print(f"\n--- Testing Sampling Rate: {freq} Hz ({1000/freq:.2f} ms interval) ---")

        for rep in range(1, repeats + 1):
            stop_event = threading.Event()
            collector_thread = threading.Thread(
                target=_background_collector_worker,
                args=(handle, stop_event, freq),
                daemon=True
            )

            # Start collector in background
            collector_thread.start()
            try:
                print(f"  -> Run #{rep} with {freq} Hz collector...", end="", flush=True)
                iters = run_gpu_workload(duration_sec=duration_per_run)
                results_by_freq[freq].append(iters)
                print(f" Finished: {iters} iterations.")
            finally:
                # Stop collector
                stop_event.set()
                collector_thread.join(timeout=2.0)

        freq_mean = float(np.mean(results_by_freq[freq]))
        # Calculate percentage slowdown relative to baseline
        slowdown_pct = ((baseline_mean - freq_mean) / baseline_mean) * 100.0
        mean_slowdowns[freq] = max(0.0, slowdown_pct)
        print(f"  [RESULT {freq} Hz] Mean: {freq_mean:.1f} iters | Slowdown: {mean_slowdowns[freq]:.2f}%")

    # --- Phase 3: Plot and Save Results ---
    print(f"\n[PHASE 3] Generating overhead chart -> '{output_chart_file}'...")
    fig, ax = plt.subplots(figsize=(9, 5), dpi=300)

    freq_labels = [f"{f} Hz" for f in frequencies]
    slowdown_values = [mean_slowdowns[f] for f in frequencies]

    bars = ax.bar(freq_labels, slowdown_values, color="#3b82f6", edgecolor="#1d4ed8", width=0.5)

    ax.set_title("Compute-Fabric: GPU Workload Slowdown vs Telemetry Sampling Frequency", fontsize=12, fontweight="bold", pad=15)
    ax.set_xlabel("Collector Sampling Frequency", fontsize=10, labelpad=10)
    ax.set_ylabel("Workload Slowdown (%)", fontsize=10, labelpad=10)
    ax.grid(axis="y", linestyle="--", alpha=0.5)

    # Annotate bar values
    for bar in bars:
        height = bar.get_height()
        ax.annotate(f"{height:.2f}%",
                    xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 4),
                    textcoords="offset points",
                    ha="center", va="bottom", fontsize=10, fontweight="semibold")

    # Set reasonable y limits
    max_val = max(slowdown_values) if slowdown_values else 1.0
    ax.set_ylim(0, max(5.0, max_val * 1.3))

    plt.tight_layout()
    plt.savefig(output_chart_file)
    plt.close()
    print(f"[SUCCESS] Chart successfully saved to '{output_chart_file}'.")

    return {
        "baseline_mean": baseline_mean,
        "baseline_cv_percent": cv_percent,
        "slowdowns": mean_slowdowns
    }


if __name__ == "__main__":
    # When running directly, execute standard benchmark run
    run_benchmark_suite(duration_per_run=60.0, frequencies=[1, 10, 100, 1000], repeats=3)
