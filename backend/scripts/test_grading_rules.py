from __future__ import annotations

import sys
from pathlib import Path

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.grading_service import (
    calculate_thesis_examination_score,
    classify_degree_level,
)


def run_tests():
    print("=== Testing Thesis Grading Rules & 3rd Examiner Logic ===\n")

    # Test 1: Undergraduate
    ug_res = calculate_thesis_examination_score(
        "Undergraduate",
        [{"score": 82.5, "examiner_type": "internal"}],
    )
    print("1. Undergraduate single supervisor mark:")
    print("   Result:", ug_res)
    assert ug_res["average_score"] == 82.5
    assert ug_res["requires_third_examiner"] is False
    assert ug_res["score_difference"] is None
    print("   -> PASS\n")

    # Test 2: Master's with difference <= 20
    m_res_pass = calculate_thesis_examination_score(
        "Masters",
        [
            {"score": 78.0, "examiner_type": "internal"},
            {"score": 72.0, "examiner_type": "internal"},
        ],
    )
    print("2. Master's 2 internal marks (diff <= 20):")
    print("   Result:", m_res_pass)
    assert m_res_pass["average_score"] == 75.0
    assert m_res_pass["requires_third_examiner"] is False
    assert m_res_pass["score_difference"] == 6.0
    print("   -> PASS\n")

    # Test 3: Master's with difference > 20 (Triggers 3rd examiner requirement)
    m_res_diff = calculate_thesis_examination_score(
        "Masters",
        [
            {"score": 88.0, "examiner_type": "internal"},
            {"score": 60.0, "examiner_type": "internal"},
        ],
    )
    print("3. Master's 2 internal marks (diff > 20):")
    print("   Result:", m_res_diff)
    assert m_res_diff["average_score"] == 74.0
    assert m_res_diff["requires_third_examiner"] is True
    assert m_res_diff["score_difference"] == 28.0
    print("   -> PASS\n")

    # Test 4: Master's with 3rd examiner submitted mark
    m_res_third = calculate_thesis_examination_score(
        "Masters",
        [
            {"score": 88.0, "examiner_type": "internal"},
            {"score": 60.0, "examiner_type": "internal"},
            {"score": 74.0, "examiner_type": "third"},
        ],
    )
    print("4. Master's with 3rd Examiner mark (Sum of 3 / 3):")
    print("   Result:", m_res_third)
    # (88 + 60 + 74) / 3 = 222 / 3 = 74.0
    assert m_res_third["average_score"] == 74.0
    assert m_res_third["third_examiner_score"] == 74.0
    assert m_res_third["requires_third_examiner"] is True
    print("   -> PASS\n")

    # Test 5: MPhil with 1 Internal, 1 External (diff <= 20)
    mphil_pass = calculate_thesis_examination_score(
        "MPhil",
        [
            {"score": 80.0, "examiner_type": "internal"},
            {"score": 76.0, "examiner_type": "external"},
        ],
    )
    print("5. MPhil 1 Internal + 1 External (diff <= 20):")
    print("   Result:", mphil_pass)
    assert mphil_pass["average_score"] == 78.0
    assert mphil_pass["requires_third_examiner"] is False
    assert mphil_pass["score_difference"] == 4.0
    print("   -> PASS\n")

    # Test 6: MPhil with 1 Internal, 1 External (diff > 20) + 3rd Examiner
    mphil_third = calculate_thesis_examination_score(
        "MPhil",
        [
            {"score": 90.0, "examiner_type": "internal"},
            {"score": 65.0, "examiner_type": "external"},
            {"score": 79.0, "examiner_type": "third"},
        ],
    )
    print("6. MPhil with 3rd Examiner (Sum of 3 / 3):")
    print("   Result:", mphil_third)
    # (90 + 65 + 79) / 3 = 234 / 3 = 78.0
    assert mphil_third["average_score"] == 78.0
    assert mphil_third["requires_third_examiner"] is True
    print("   -> PASS\n")

    print("ALL TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()
