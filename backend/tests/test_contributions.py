from datetime import date, timedelta

import pandas as pd

from app.services.contributions import _longest_streak, aggregate_frame, iter_date_chunks


def test_date_chunks_are_contiguous_and_bounded() -> None:
    chunks = list(iter_date_chunks(date(2023, 1, 1), date(2025, 1, 5)))
    assert chunks[0] == (date(2023, 1, 1), date(2023, 12, 31))
    assert chunks[-1][1] == date(2025, 1, 5)
    assert all((end - start).days <= 364 for start, end in chunks)
    assert all(chunks[index][1] + timedelta(days=1) == chunks[index + 1][0] for index in range(len(chunks) - 1))


def test_weekly_aggregation_and_clipped_boundaries() -> None:
    frame = pd.DataFrame(
        {
            "date": list(pd.date_range("2025-01-01", "2025-01-10").date),
            "count": [1] * 10,
            "color": ["#000"] * 10,
            "weekday": [0] * 10,
        }
    )
    points = aggregate_frame(frame, "week")
    assert [point.count for point in points] == [5, 5]
    assert points[0].start_date == date(2025, 1, 1)
    assert points[-1].end_date == date(2025, 1, 10)


def test_longest_streak() -> None:
    assert _longest_streak([0, 1, 2, 0, 4, 3, 1, 0]) == 3
