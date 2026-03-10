import axios from 'axios';

export const fetchGoogleFitData = async (accessToken) => {
  const endTime = Date.now();
  const startTime = endTime - (24 * 60 * 60 * 1000); // Last 24 hours

  try {
    const response = await axios.post(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [
          { dataTypeName: "com.google.step_count.delta" },
          { dataTypeName: "com.google.heart_rate.bpm" },
          { dataTypeName: "com.google.oxygen_saturation" },
          { dataTypeName: "com.google.blood_pressure" }
        ],
        bucketByTime: { durationMillis: 86400000 }, // 1 Day bucket
        startTimeMillis: startTime,
        endTimeMillis: endTime
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const bucket = response.data.bucket[0];
    
    // Helper function to safely get value from dataset
    const getValue = (type, index = 0) => {
      const dataset = bucket.dataset.find(d => d.dataSourceId.includes(type));
      if (dataset && dataset.point.length > 0) {
        // value[0] is usually intVal or fpVal
        return dataset.point[0].value[index].intVal || dataset.point[0].value[index].fpVal || 0;
      }
      return 0;
    };

    // 1. Steps
    const steps = getValue("step_count");

    // 2. Heart Rate
    const heartRate = getValue("heart_rate");

    // 3. SpO2 (Oxygen)
    const spo2 = getValue("oxygen_saturation");

    // 4. Blood Pressure (Index 0 = Systolic, Index 1 = Diastolic)
    // Note: Google Fit stores BP as a composite value in this order usually.
    let systolic = 0;
    let diastolic = 0;
    const bpDataset = bucket.dataset.find(d => d.dataSourceId.includes("blood_pressure"));
    if (bpDataset && bpDataset.point.length > 0) {
        systolic = bpDataset.point[0].value[0].fpVal || 0;
        diastolic = bpDataset.point[0].value[1].fpVal || 0;
    }

    return { 
      steps, 
      heartRate: Math.round(heartRate), 
      spo2: Math.round(spo2), 
      systolic: Math.round(systolic), 
      diastolic: Math.round(diastolic) 
    };

  } catch (error) {
    console.error("Error fetching Google Fit data:", error);
    // Return zeros so the app doesn't crash
    return { steps: 0, heartRate: 0, spo2: 0, systolic: 0, diastolic: 0 };
  }
};