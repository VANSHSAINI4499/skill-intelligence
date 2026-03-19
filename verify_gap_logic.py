
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

async def verify():
    print("--- Verifying Gap Analysis Logic ---")
    try:
        from services.batch_analytics_service import compute_student_gap_analysis
        
        # Mock batch analytics
        mock_batch_analytics = {
            "avgScore": 50.1,
            "totalStudents": 100,
            "gradeDistribution": {
                "A": 10,
                "B": 20,
                "C": 30,
                "D": 30,
                "F": 10
            },
            "groupAverages": {
                "A": 85.0,
                "B": 70.0,
                "C": 55.0,
                "D": 27.2,
                "F": 15.0
            }
        }
        
        student_score = 25.79
        student_group = "D"
        
        print(f"Testing with Score: {student_score}, Group: {student_group}")
        
        result = compute_student_gap_analysis(student_score, student_group, mock_batch_analytics)
        
        print("\nResults:")
        for k, v in result.items():
            print(f"  {k}: {v}")
            
        # Assertions for the inverted gap (Score - Avg)
        # 25.79 - 27.2 = -1.41
        # 25.79 - 50.1 = -24.31
        
        expected_group_gap = round(25.79 - 27.2, 3)
        expected_batch_gap = round(25.79 - 50.1, 3)
        
        assert result["groupGap"] == expected_group_gap, f"Expected {expected_group_gap}, got {result['groupGap']}"
        assert result["batchGap"] == expected_batch_gap, f"Expected {expected_batch_gap}, got {result['batchGap']}"
        
        print("\n✅ GAP LOGIC VERIFIED (Score - Avg logic is correct)")
        
    except Exception as e:
        print(f"\n❌ VERIFICATION FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
