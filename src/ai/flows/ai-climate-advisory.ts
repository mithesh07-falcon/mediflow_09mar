'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIClimateAdvisoryInputSchema = z.object({
    latitude: z.number().describe("User's current latitude"),
    longitude: z.number().describe("User's current longitude")
});

const AIClimateAdvisoryOutputSchema = z.object({
    temperature: z.string().describe("Formatted temperature string (e.g., '24°C')"),
    condition: z.string().describe("Simple text condition (e.g., 'Sunny & Clear', 'Light Rain', 'Hazy')"),
    aqiStatus: z.string().describe("A short formatted AQI text (e.g., 'AQI 45 (Good)')"),
    pollenStatus: z.string().describe("A single word describing inferred pollen level based on weather (e.g., 'Low', 'Moderate', 'High')"),
    advisoryList: z.array(z.string()).describe("A list of 3 specific, actionable health tips based strictly on the current climate to prevent illness/issues."),
    hasAlert: z.boolean().describe("True if the current weather/AQI poses a notable medical risk (e.g., extreme heat, bad air quality) requiring an alert banner."),
    alertMessage: z.string().describe("If hasAlert is true, provide a 1-2 sentence medical warning explaining why they should be careful and what to do.").optional(),
});

export type AIClimateAdvisoryInput = z.infer<typeof AIClimateAdvisoryInputSchema>;
export type AIClimateAdvisoryOutput = z.infer<typeof AIClimateAdvisoryOutputSchema>;

export async function getClimateAdvisory(input: AIClimateAdvisoryInput): Promise<AIClimateAdvisoryOutput> {
    let weatherText = "Unable to fetch exact weather.";

    try {
        // 1. Fetch real weather data from Open-Meteo
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`);
        const weatherData = await weatherRes.json();

        // 2. Fetch air quality data from Open-Meteo
        const airQualityRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${input.latitude}&longitude=${input.longitude}&current=us_aqi,pm10,pm2_5`);
        const airQualityData = await airQualityRes.json();

        weatherText = `
      Temperature: ${weatherData.current?.temperature_2m}°C
      Humidity: ${weatherData.current?.relative_humidity_2m}%
      Precipitation: ${weatherData.current?.precipitation}mm
      Wind Speed: ${weatherData.current?.wind_speed_10m}km/h
      US AQI: ${airQualityData.current?.us_aqi}
      PM 10: ${airQualityData.current?.pm10}
      PM 2.5: ${airQualityData.current?.pm2_5}
    `;
    } catch (error) {
        console.warn("Failed to fetch weather from external APIs", error);
    }

    const result = await ai.generate({
        prompt: `Analyze the following real-time local weather and air quality data:\n\n${weatherText}\n\n1. Parse the temperature and estimate a human-readable condition.\n2. Summarize the AQI.\n3. Make a logical guess for Pollen based on temperature/humidity.\n4. Create 3 highly specific health prevention tasks based on THIS EXACT weather so the patient doesn't get sick or aggravate conditions. Are they at risk of dehydration? Allergies? Cold? Heat stroke?\n5. If the weather is hazardous (bad AQI, extreme temp), activate the alert banner with a medical warning.`,
        output: { schema: AIClimateAdvisoryOutputSchema },
    });

    return result.output!;
}
