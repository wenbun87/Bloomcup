"""
Daily orchestrator for the bot. Runs the full pipeline:

  1. fetch_football_fixtures.py  — pull latest fixtures + results
  2. update_elo.py               — apply Elo updates from new results
  3. run_poisson.py              — re-predict all upcoming matches
  4. score_predictions.py        — fill in user points for new results

Designed to run from GitHub Actions on a daily cron, but also works
locally:

    python scripts/daily_update.py

Each step is idempotent — rerunning is safe.
"""

import os
import subprocess
import sys

SCRIPTS = [
    'fetch_football_fixtures.py',
    'update_elo.py',
    'run_poisson.py',
    'score_predictions.py',
]

HERE = os.path.dirname(os.path.abspath(__file__))


def run(script):
    print(f'\n========== {script} ==========')
    result = subprocess.run([sys.executable, os.path.join(HERE, script)])
    if result.returncode != 0:
        sys.exit(f'\n{script} failed with exit code {result.returncode}')


def main():
    for script in SCRIPTS:
        run(script)
    print('\nall done.')


if __name__ == '__main__':
    main()
