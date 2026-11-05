# Compute Fabric - Component Specifications

### src/febric/__init__.py
This module acts as the public entry package initializer. It takes in internal module definitions and exposes version metadata, core orchestration classes, and package exports.

### src/febric/collector.py
This file samples GPU hardware telemetry at high frequency (1 kHz) via low-level interfaces such as NVML. It takes in polling intervals, hardware configuration flags, and active device IDs, and outputs raw structured time-series metrics including thermal readings, NVLink error counters, and PCIe error signals.

### src/febric/logwatch.py
This component listens to Linux system and GPU diagnostic ring buffers (such as dmesg and XID logs). It takes in raw kernel diagnostic streams and driver event lines, parses known GPU error signatures, and outputs structured, timestamped error event objects.

### src/febric/rules.py
This engine evaluates incoming telemetry and kernel logs against failure prediction thresholds to detect anomalies within the 15-minute critical window. It takes in rolling telemetry windows and parsed log event feeds, applies early-failure heuristic rules, and outputs health status verdicts along with critical failure warning flags.

### src/febric/actions.py
This module handles orchestration and workload migration logic. It takes in migration signals, target cluster GPU utilization metrics, and current job IDs, and outputs container/process migration commands to transfer running tasks to healthy, low-compute or idle GPUs.

### src/febric/cli.py
This file provides the command-line interface for system operators. It takes in user CLI flags, monitoring options, and configuration overrides, and outputs console dashboard views, execution logs, and service status feedback.

### tests/test_logwatch.py
This test suite verifies system log parsing and pattern recognition accuracy. It takes in simulated kernel log snippets with injected NVLink/XID faults, and outputs test assertions confirming error events are identified and structured correctly.

### tests/test_rules.py
This test suite evaluates the accuracy of the crash prediction engine. It takes in synthesized 1000 Hz thermal spike and error counter datasets, and outputs test assertions verifying that imminent failure alerts are triggered accurately within the 15-minute threshold.
