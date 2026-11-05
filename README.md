# Compute Fabric

Command-line monitor that reads one NVIDIA GPU through NVML, scans `dmesg` for NVIDIA Xid and PCIe AER lines, and prints `OK`, `WATCH`, or `FAILING` for the current sample window.

Early project. Tested only on one Tesla T4 (Google Colab).

## Example output

These are the lines `cli.py` prints. Values in angle brackets come from the machine. The first health line uses Python `None` because there is no previous state yet.

```text
[INFO] Initializing NVML monitoring on node 'gpu-node-01' (scheduler: kubernetes)...
[INFO] Starting live monitor (interval: 0.05s, duration: 60.0s, dry_run: True)...
[HEALTH CHANGE] None -> OK | Reason: GPU operating within normal parameters.
[STATUS] Elapsed: <elapsed>s | State: OK | Temp: <temperature>°C | Power: <power_draw>W
[HEALTH CHANGE] OK -> FAILING | Reason: Uncorrectable double-bit ECC error detected (<count> errors).
[DRY-RUN] Action command: kubectl cordon gpu-node-01
[INFO] Monitor loop finished.
```

`OK` and `WATCH` do not print a command. `FAILING` prints a command. With the default dry run, that command is not executed. Replay uses a different state line: `[ROW <n>] State Transition: <previous> -> <state> | Reason: <reason>`.

## Install

```bash
git clone https://github.com/topgsanjid-ux/Compute-fabric.git
cd Compute-fabric
pip install -e .
```

The import name is `febric`. Run it with `python -m febric.cli`.

## Usage

```bash
python -m febric.cli monitor
python -m febric.cli monitor --interval 0.05 --duration 60 --output readings.csv --node-name gpu-node-01 --scheduler kubernetes
python -m febric.cli replay path/to/readings.csv --node-name gpu-node-01 --scheduler slurm
```

`monitor` flags:

- `--interval` sampling interval in seconds (default `0.05`)
- `--duration` seconds to run (default `60`; `0` keeps running)
- `--output` / `-o` CSV file for readings
- `--node-name` name used in the printed command (default `gpu-node-01`)
- `--scheduler` `kubernetes` or `slurm` (default `kubernetes`)
- `--no-dry-run` run the cordon or drain command; omit it to only print the command

`replay` takes a CSV path and the same `--node-name`, `--scheduler`, and `--no-dry-run` flags. It does not read `dmesg`. This repo has no sample telemetry CSV.

On `FAILING`, the printed command is `kubectl cordon <node>` or `scontrol update nodename=<node> state=drain reason="<reason>"`. State changes are appended to `fabric_actions.log`.

`monitor` also runs `dmesg` each sample and keeps NVIDIA Xid lines and PCIe AER lines (`Corrected` or `Uncorrected`). If `dmesg` cannot be run, it prints a warning and continues with no log events. Only GPU 0 is opened.

## What it checks

`collector.py` reads GPU 0 only:

- GPU temperature
- power draw from NVML (`nvmlDeviceGetPowerUsage`; the status line prints that value with a `W` suffix)
- graphics clock and memory clock
- GPU and memory utilization
- current clocks throttle-reason bitmask
- volatile ECC corrected count and volatile ECC uncorrected count
- current and maximum PCIe link generation
- current and maximum PCIe link width

If an NVML call fails, that field is stored as `none`.

## Overhead

`bench.py` is written to time a PyTorch `4096 x 4096` FP32 matmul with the collector running at 1 Hz, 10 Hz, 100 Hz, and 1000 Hz. No overhead numbers are filled in here. Run `bench.py` on the machine you care about and replace this table.

| Sampling frequency | Interval | Workload slowdown |
| --- | --- | --- |
| 1 Hz | 1000 ms | not measured |
| 10 Hz | 100 ms | not measured |
| 100 Hz | 10 ms | not measured |
| 1000 Hz | 1 ms | not measured |

## What it does not do

- It does not predict a future failure. It labels the current window `OK`, `WATCH`, or `FAILING`.
- It does not migrate jobs. On `FAILING` it prints a Kubernetes cordon or a Slurm drain command. Those commands are dry-run unless you pass `--no-dry-run`.
- Tested on one Tesla T4 only.
- It cannot see host-level PCIe AER from inside a VM or container when `dmesg` is blocked or does not contain the host log.
- It covers GPU 0 NVML readings and NVIDIA Xid / PCIe AER lines from `dmesg` only.

## Feedback

Does this catch anything your current setup misses, or is nvidia-smi plus your existing monitoring enough?

Open a GitHub Issue or Discussion.

## License

MIT. Copyright (c) 2026 Sanjid Hossain.
