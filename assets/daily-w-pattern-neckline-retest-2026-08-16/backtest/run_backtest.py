from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
STUDY_ROOT = HERE.parent
sys.path.insert(0, str(HERE))

from w_backtest.cli import run_analysis

if __name__ == "__main__":
    run_analysis(STUDY_ROOT / "regenerated", STUDY_ROOT / "backtest-data", "2026-08-15")
