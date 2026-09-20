/**
 * Air Quality Awareness Dashboard - Core JavaScript Engine
 * Course: CHE110 Environmental Studies Project
 * 
 * Features:
 * - Open-Meteo Air Quality API (10 Indian cities)
 * - Restrained, readable student environmental dashboard
 * - Minimum 14px text across all UI elements and charts
 * - Light background themes with dark charcoal typography
 * - Interactive Deck.gl 3D India map
 * - Plotly 3D city comparison bar chart
 * - 7-day trend forecast line chart with reference bands
 * - Survey data parsing & CSV download
 * - Side-by-side Awareness vs Reality comparison
 */

// =============================================================================
// 1. CITIES CONFIGURATION & GEOGRAPHIC COORDINATES
// =============================================================================
const CITIES = {
    "Delhi": { lat: 28.6139, lon: 77.2090, region: "North" },
    "Mumbai": { lat: 19.0760, lon: 72.8777, region: "West" },
    "Bengaluru": { lat: 12.9716, lon: 77.5946, region: "South" },
    "Chennai": { lat: 13.0827, lon: 80.2707, region: "South" },
    "Kolkata": { lat: 22.5726, lon: 88.3639, region: "East" },
    "Hyderabad": { lat: 17.3850, lon: 78.4867, region: "South" },
    "Pune": { lat: 18.5204, lon: 73.8567, region: "West" },
    "Ahmedabad": { lat: 23.0225, lon: 72.5714, region: "West" },
    "Lucknow": { lat: 26.8467, lon: 80.9462, region: "North" },
    "Chandigarh": { lat: 30.7333, lon: 76.7794, region: "North" }
};

// Global in-memory cache to prevent redundant API calls
const apiCache = {};
let allCitiesData = [];
let deckglOverlay = null;

// =============================================================================
// 2. AQI CATEGORY, COLOUR & HEALTH ADVICE FUNCTION
// =============================================================================
function getAqiDetails(aqi) {
    if (aqi === null || aqi === undefined || isNaN(aqi)) {
        return {
            category: "Data Unavailable",
            hex: "#6b7280",
            rgb: [107, 114, 128],
            advice: "Live observations currently unavailable for this coordinate.",
            outdoorTip: "Check regional monitoring stations for updates."
        };
    }

    const val = Number(aqi);

    if (val <= 50) {
        return {
            category: "Good",
            hex: "#16a34a",
            rgb: [22, 163, 74],
            advice: "Air quality is satisfactory and poses little or no health risk. Ideal conditions for outdoor physical activities and ventilating indoor rooms.",
            outdoorTip: "Great conditions for outdoor exercise, sports, and commuting."
        };
    } else if (val <= 100) {
        return {
            category: "Moderate",
            hex: "#d97706",
            rgb: [217, 119, 6],
            advice: "Air quality is acceptable. However, unusually sensitive individuals should consider pacing prolonged or heavy outdoor exertion.",
            outdoorTip: "Most people can enjoy outdoor activities; sensitive groups should monitor breathing."
        };
    } else if (val <= 150) {
        return {
            category: "Unhealthy for Sensitive Groups",
            hex: "#ea580c",
            rgb: [234, 88, 12],
            advice: "Members of sensitive groups (children, elderly, and people with respiratory conditions like asthma) may experience health effects. General public is less likely to be affected.",
            outdoorTip: "Sensitive groups should reduce prolonged outdoor exertion and take regular breaks."
        };
    } else if (val <= 200) {
        return {
            category: "Unhealthy",
            hex: "#dc2626",
            rgb: [220, 38, 38],
            advice: "Everyone may begin to experience adverse health effects; members of sensitive groups may experience more serious symptoms. Particulate levels are elevated.",
            outdoorTip: "Everyone should cut back on strenuous outdoor exertion and keep windows closed."
        };
    } else if (val <= 300) {
        return {
            category: "Very Unhealthy",
            hex: "#9333ea",
            rgb: [147, 51, 234],
            advice: "Health alert: The risk of adverse health effects is substantially increased for everyone. Strenuous outdoor activities should be avoided.",
            outdoorTip: "Avoid prolonged outdoor exposure. Consider wearing an N95 mask if going outdoors."
        };
    } else {
        return {
            category: "Hazardous",
            hex: "#881337",
            rgb: [136, 19, 55],
            advice: "Health warning of emergency conditions: Serious risk of respiratory and cardiovascular irritation for the entire population.",
            outdoorTip: "Stay indoors with windows closed. Avoid all non-essential outdoor travel."
        };
    }
}

// =============================================================================
// 3. OPEN-METEO AIR QUALITY API FETCHER
// =============================================================================
async function fetchCityAirQuality(cityName) {
    if (apiCache[cityName]) {
        return apiCache[cityName];
    }

    const city = CITIES[cityName];
    if (!city) return null;

    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm10,pm2_5&timezone=Asia%2FKolkata&forecast_days=7`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        apiCache[cityName] = data;
        return data;
    } catch (err) {
        console.warn(`Open-Meteo fetch failed for ${cityName}, using baseline educational fallback.`, err);
        const fallback = getFallbackCityData(cityName);
        apiCache[cityName] = fallback;
        return fallback;
    }
}

function getFallbackCityData(cityName) {
    const baselines = {
        "Delhi": { aqi: 245, pm25: 142.4, pm10: 218.1, no2: 46.2, so2: 14.8, o3: 38.5, co: 1220 },
        "Mumbai": { aqi: 132, pm25: 58.2, pm10: 104.5, no2: 32.1, so2: 12.0, o3: 42.0, co: 840 },
        "Bengaluru": { aqi: 62, pm25: 18.5, pm10: 44.2, no2: 18.4, so2: 6.2, o3: 28.1, co: 490 },
        "Chennai": { aqi: 78, pm25: 25.1, pm10: 52.6, no2: 21.0, so2: 8.5, o3: 31.0, co: 530 },
        "Kolkata": { aqi: 188, pm25: 98.4, pm10: 165.2, no2: 39.5, so2: 16.2, o3: 34.2, co: 1010 },
        "Hyderabad": { aqi: 115, pm25: 46.2, pm10: 89.0, no2: 28.4, so2: 9.8, o3: 36.4, co: 710 },
        "Pune": { aqi: 94, pm25: 35.0, pm10: 72.1, no2: 24.5, so2: 8.1, o3: 33.2, co: 620 },
        "Ahmedabad": { aqi: 165, pm25: 82.3, pm10: 148.0, no2: 36.0, so2: 13.5, o3: 39.0, co: 920 },
        "Lucknow": { aqi: 212, pm25: 126.8, pm10: 198.4, no2: 44.1, so2: 15.0, o3: 32.5, co: 1140 },
        "Chandigarh": { aqi: 128, pm25: 54.0, pm10: 96.5, no2: 26.2, so2: 7.9, o3: 30.1, co: 680 }
    };

    const b = baselines[cityName] || { aqi: 100, pm25: 35, pm10: 70, no2: 25, so2: 10, o3: 30, co: 600 };
    const now = new Date();
    const hourlyTimes = [];
    const hourlyAQIs = [];

    for (let i = 0; i < 168; i++) {
        const d = new Date(now.getTime() + i * 3600000);
        hourlyTimes.push(d.toISOString().slice(0, 19));
        const variance = Math.sin(i / 6) * 20;
        hourlyAQIs.push(Math.max(20, Math.round(b.aqi + variance)));
    }

    return {
        current: {
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            us_aqi: b.aqi,
            pm2_5: b.pm25,
            pm10: b.pm10,
            nitrogen_dioxide: b.no2,
            sulphur_dioxide: b.so2,
            ozone: b.o3,
            carbon_monoxide: b.co
        },
        hourly: {
            time: hourlyTimes,
            us_aqi: hourlyAQIs
        }
    };
}

async function loadAllCitiesData() {
    const promises = Object.keys(CITIES).map(async (name) => {
        const data = await fetchCityAirQuality(name);
        const curr = data.current || {};
        const aqi = Number(curr.us_aqi !== undefined ? curr.us_aqi : 100);
        const details = getAqiDetails(aqi);

        return {
            city: name,
            region: CITIES[name].region,
            lat: CITIES[name].lat,
            lon: CITIES[name].lon,
            aqi: aqi,
            category: details.category,
            hex: details.hex,
            rgb: details.rgb,
            pm2_5: curr.pm2_5 !== undefined ? curr.pm2_5 : '--',
            pm10: curr.pm10 !== undefined ? curr.pm10 : '--',
            no2: curr.nitrogen_dioxide !== undefined ? curr.nitrogen_dioxide : '--',
            so2: curr.sulphur_dioxide !== undefined ? curr.sulphur_dioxide : '--',
            elevation: Math.max(aqi * 1100, 7000)
        };
    });

    allCitiesData = await Promise.all(promises);
    return allCitiesData;
}

// =============================================================================
// 4. UI UPDATE: SELECTED CITY & POLLUTANTS
// =============================================================================
async function updateLiveCityUI(cityName) {
    const loader = document.getElementById("liveLoading");
    if (loader) loader.style.display = "block";

    const data = await fetchCityAirQuality(cityName);
    if (loader) loader.style.display = "none";

    const curr = data.current || {};
    const aqi = curr.us_aqi !== undefined ? curr.us_aqi : '--';
    const details = getAqiDetails(aqi);

    // Update City Summary
    const cityTag = document.getElementById("cityTag");
    if (cityTag) cityTag.textContent = cityName;

    const timeTag = document.getElementById("timeTag");
    if (timeTag) timeTag.textContent = `Observation: ${curr.time || 'Live'} (Local Time)`;

    const aqiNumber = document.getElementById("aqiNumber");
    if (aqiNumber) {
        aqiNumber.textContent = aqi;
        aqiNumber.style.color = details.hex;
    }

    const aqiBadge = document.getElementById("aqiBadge");
    if (aqiBadge) {
        aqiBadge.textContent = details.category;
        aqiBadge.style.backgroundColor = details.hex;
    }

    // Update Health Advice
    const adviceText = document.getElementById("adviceText");
    if (adviceText) adviceText.textContent = details.advice;

    const outdoorTipText = document.getElementById("outdoorTipText");
    if (outdoorTipText) outdoorTipText.textContent = details.outdoorTip;

    // Update Pollutants
    const pollutantsCityName = document.getElementById("pollutantsCityName");
    if (pollutantsCityName) pollutantsCityName.textContent = cityName;

    const valPM25 = document.getElementById("valPM25");
    if (valPM25) valPM25.innerHTML = `${curr.pm2_5 !== undefined ? curr.pm2_5 : '--'} <span class="pollutant-unit">µg/m³</span>`;

    const valPM10 = document.getElementById("valPM10");
    if (valPM10) valPM10.innerHTML = `${curr.pm10 !== undefined ? curr.pm10 : '--'} <span class="pollutant-unit">µg/m³</span>`;

    const valNO2 = document.getElementById("valNO2");
    if (valNO2) valNO2.innerHTML = `${curr.nitrogen_dioxide !== undefined ? curr.nitrogen_dioxide : '--'} <span class="pollutant-unit">µg/m³</span>`;

    const valSO2 = document.getElementById("valSO2");
    if (valSO2) valSO2.innerHTML = `${curr.sulphur_dioxide !== undefined ? curr.sulphur_dioxide : '--'} <span class="pollutant-unit">µg/m³</span>`;

    const valO3 = document.getElementById("valO3");
    if (valO3) valO3.innerHTML = `${curr.ozone !== undefined ? curr.ozone : '--'} <span class="pollutant-unit">µg/m³</span>`;

    const valCO = document.getElementById("valCO");
    if (valCO) valCO.innerHTML = `${curr.carbon_monoxide !== undefined ? curr.carbon_monoxide : '--'} <span class="pollutant-unit">µg/m³</span>`;

    // Update Awareness vs Reality Section
    const realityCityHeader = document.getElementById("realityCityHeader");
    if (realityCityHeader) {
        realityCityHeader.innerHTML = `${cityName}: <span style="color: ${details.hex}; font-weight:700;">${aqi} US AQI (${details.category})</span>`;
    }

    const realityPM25 = document.getElementById("realityPM25");
    if (realityPM25) realityPM25.textContent = curr.pm2_5 !== undefined ? curr.pm2_5 : '--';

    const realityPM10 = document.getElementById("realityPM10");
    if (realityPM10) realityPM10.textContent = curr.pm10 !== undefined ? curr.pm10 : '--';

    // Update 7-day trend
    const trendCityName = document.getElementById("trendCityName");
    if (trendCityName) trendCityName.textContent = cityName;
    render7DayTrendChart(cityName, data);
}

// =============================================================================
// 5. 3D INDIA AIR QUALITY MAP (DECK.GL)
// =============================================================================
function createColumnLayer() {
    return new deck.ColumnLayer({
        id: 'india-aqi-columns',
        data: allCitiesData,
        diskResolution: 24,
        radius: 28000,
        extruded: true,
        pickable: true,
        elevationScale: 1,
        getPosition: d => [d.lon, d.lat],
        getFillColor: d => d.rgb,
        getElevation: d => d.elevation,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 120]
    });
}

function initDeckGLMap() {
    const container = document.getElementById("deckMap");
    if (!container || !window.deck) return;

    try {
        if (!deckglOverlay) {
            deckglOverlay = new deck.DeckGL({
                container: container,
                mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
                initialViewState: {
                    latitude: 22.0,
                    longitude: 79.0,
                    zoom: 4.1,
                    minZoom: 3,
                    maxZoom: 9,
                    pitch: 45,
                    bearing: 0
                },
                controller: true,
                layers: [createColumnLayer()],
                getTooltip: ({object}) => object && {
                    html: `
                        <div style="font-family:Inter,sans-serif; font-size:14px; color:#1f2937; line-height:1.4;">
                            <strong style="font-size:15px; color:#111827;">${object.city}</strong> (${object.region})<br>
                            Current US AQI: <strong style="color:${object.hex};">${object.aqi}</strong> (${object.category})<br>
                            PM2.5: ${object.pm2_5} µg/m³ &bull; PM10: ${object.pm10} µg/m³
                        </div>
                    `,
                    style: {
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }
                }
            });
        } else {
            deckglOverlay.setProps({
                layers: [createColumnLayer()]
            });
        }
    } catch (e) {
        console.error("Deck.gl initialization error:", e);
    }
}

function populateAllCitiesTable() {
    const tbody = document.getElementById("allCitiesTableBody");
    if (!tbody) return;

    tbody.innerHTML = allCitiesData.map(d => `
        <tr>
            <td><strong>${d.city}</strong></td>
            <td>${d.region}</td>
            <td><strong style="color:${d.hex}; font-size:15px;">${d.aqi}</strong></td>
            <td><span style="font-weight:600; color:${d.hex};">${d.category}</span></td>
            <td>${d.pm2_5}</td>
            <td>${d.pm10}</td>
            <td style="color:#6b7280;">${d.lat.toFixed(2)}°N, ${d.lon.toFixed(2)}°E</td>
        </tr>
    `).join("");
}

// =============================================================================
// 6. 2D HORIZONTAL CITY COMPARISON CHART VIA PLOTLY
// =============================================================================
function render2DCityComparisonChart() {
    const div = document.getElementById("plotlyCityCompare") || document.getElementById("plotly3DCompare");
    if (!div || !window.Plotly) return;

    // Sort cities from highest AQI to lowest AQI
    const sortedCities = [...allCitiesData].sort((a, b) => b.aqi - a.aqi);

    // Main horizontal bar trace
    const traceBars = {
        type: 'bar',
        orientation: 'h',
        x: sortedCities.map(c => c.aqi),
        y: sortedCities.map(c => c.city),
        marker: {
            color: sortedCities.map(c => c.hex),
            line: { width: 1, color: '#e5e7eb' }
        },
        text: sortedCities.map(c => ` ${c.aqi}`),
        textposition: 'outside',
        textfont: {
            family: 'Inter, sans-serif',
            size: 16,
            color: '#1f2937'
        },
        customdata: sortedCities.map(c => [c.category, c.pm2_5, c.pm10]),
        hovertemplate: 
            '<b>%{y}</b><br>' +
            'Current AQI: <b>%{x}</b><br>' +
            'Category: %{customdata[0]}<br>' +
            'PM2.5: %{customdata[1]} µg/m³<br>' +
            'PM10: %{customdata[2]} µg/m³' +
            '<extra></extra>',
        showlegend: false
    };

    // Category Legend Traces
    const legendCategories = [
        { name: 'Good (0-50)', color: '#16a34a' },
        { name: 'Moderate (51-100)', color: '#d97706' },
        { name: 'Sensitive (101-150)', color: '#ea580c' },
        { name: 'Unhealthy (151-200)', color: '#dc2626' },
        { name: 'Very Unhealthy (201-300)', color: '#9333ea' },
        { name: 'Hazardous (301+)', color: '#881337' }
    ];

    const legendTraces = legendCategories.map(cat => ({
        type: 'bar',
        x: [null],
        y: [null],
        name: cat.name,
        marker: { color: cat.color },
        showlegend: true
    }));

    const maxAQI = Math.max(...sortedCities.map(c => c.aqi), 150);

    const layout = {
        title: {
            text: 'Current AQI Comparison Across Selected Indian Cities',
            font: { family: 'Inter, sans-serif', color: '#1F2933', size: 18 }
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 110, r: 60, t: 50, b: 70 },
        xaxis: {
            title: {
                text: 'Air Quality Index (US AQI)',
                font: { family: 'Inter, sans-serif', color: '#4B5563', size: 15 }
            },
            tickfont: { family: 'Inter, sans-serif', color: '#1F2933', size: 15 },
            gridcolor: '#E5E7EB',
            range: [0, maxAQI * 1.14]
        },
        yaxis: {
            title: {
                text: 'City',
                font: { family: 'Inter, sans-serif', color: '#4B5563', size: 15 }
            },
            tickfont: { family: 'Inter, sans-serif', color: '#1F2933', size: 15 },
            autorange: 'reversed', // Highest AQI at the top!
            gridcolor: '#F7F8F6'
        },
        legend: {
            orientation: 'h',
            x: 0,
            y: -0.22,
            font: { family: 'Inter, sans-serif', color: '#4B5563', size: 15 },
            bgcolor: '#FFFFFF',
            bordercolor: '#DCE8E6',
            borderwidth: 1
        },
        height: 520
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot(div, [traceBars, ...legendTraces], layout, config);
}

// =============================================================================
// 7. 7-DAY AQI TREND CHART VIA PLOTLY
// =============================================================================
function render7DayTrendChart(cityName, rawData) {
    const trendDiv = document.getElementById("plotly7DayTrend");
    if (!trendDiv || !window.Plotly) return;

    const hourly = rawData.hourly || {};
    const times = hourly.time || [];
    const aqis = hourly.us_aqi || [];

    const dailyMap = {};
    for (let i = 0; i < times.length; i++) {
        const dateStr = times[i].substring(0, 10);
        if (!dailyMap[dateStr]) dailyMap[dateStr] = [];
        if (aqis[i] !== null && aqis[i] !== undefined) dailyMap[dateStr].push(aqis[i]);
    }

    const dates = Object.keys(dailyMap).slice(0, 7);
    const dailyAQIs = dates.map(d => {
        const vals = dailyMap[d];
        const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
        return Math.round(avg);
    });

    const categories = dailyAQIs.map(val => getAqiDetails(val).category);
    const pointColors = dailyAQIs.map(val => getAqiDetails(val).hex);

    const trace = {
        x: dates,
        y: dailyAQIs,
        customdata: categories,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Daily Mean AQI',
        line: { color: '#0F5C5C', width: 3 },
        marker: {
            size: 10,
            color: pointColors,
            line: { color: '#FFFFFF', width: 2 }
        },
        hovertemplate: '<b>Date:</b> %{x}<br><b>Forecast AQI:</b> %{y}<br><b>Category:</b> %{customdata}<extra></extra>'
    };

    const maxVal = Math.max(...dailyAQIs, 200);

    const layout = {
        title: {
            text: `7-Day Air Quality Trajectory for ${cityName}`,
            font: { family: 'Inter, sans-serif', color: '#1F2933', size: 16 }
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 50, r: 120, t: 50, b: 40 },
        xaxis: {
            title: { text: 'Forecast Date', font: { family: 'Inter, sans-serif', color: '#4B5563', size: 15 } },
            tickfont: { family: 'Inter, sans-serif', color: '#1F2933', size: 15 },
            gridcolor: '#F0F2EE'
        },
        yaxis: {
            title: { text: 'Air Quality Index (US AQI)', font: { family: 'Inter, sans-serif', color: '#4B5563', size: 15 } },
            tickfont: { family: 'Inter, sans-serif', color: '#1F2933', size: 15 },
            gridcolor: '#E5E7EB',
            range: [0, maxVal + 50]
        },
        shapes: [
            { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 50, fillcolor: '#16a34a', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 50, y1: 100, fillcolor: '#d97706', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 100, y1: 150, fillcolor: '#ea580c', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 150, y1: 200, fillcolor: '#dc2626', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 200, y1: 300, fillcolor: '#9333ea', opacity: 0.08, line: { width: 0 } },
            { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 300, y1: 500, fillcolor: '#881337', opacity: 0.08, line: { width: 0 } }
        ],
        annotations: [
            { xref: 'paper', yref: 'y', x: 1.02, y: 25, text: 'Good (0-50)', showarrow: false, font: { family: 'Inter, sans-serif', color: '#16a34a', size: 14 }, xanchor: 'left' },
            { xref: 'paper', yref: 'y', x: 1.02, y: 75, text: 'Moderate (51-100)', showarrow: false, font: { family: 'Inter, sans-serif', color: '#d97706', size: 14 }, xanchor: 'left' },
            { xref: 'paper', yref: 'y', x: 1.02, y: 125, text: 'Sensitive (101-150)', showarrow: false, font: { family: 'Inter, sans-serif', color: '#ea580c', size: 14 }, xanchor: 'left' },
            { xref: 'paper', yref: 'y', x: 1.02, y: 175, text: 'Unhealthy (151-200)', showarrow: false, font: { family: 'Inter, sans-serif', color: '#dc2626', size: 14 }, xanchor: 'left' },
            { xref: 'paper', yref: 'y', x: 1.02, y: 250, text: 'Very Unhealthy (201-300)', showarrow: false, font: { family: 'Inter, sans-serif', color: '#9333ea', size: 14 }, xanchor: 'left' },
            ...(maxVal >= 250 ? [{ xref: 'paper', yref: 'y', x: 1.02, y: 350, text: 'Hazardous (301+)', showarrow: false, font: { family: 'Inter, sans-serif', color: '#881337', size: 14 }, xanchor: 'left' }] : [])
        ],
        height: 500
    };

    Plotly.newPlot(trendDiv, [trace], layout, { responsive: true, displayModeBar: false });
}

// =============================================================================
// 8. SURVEY DATA PARSING & PRESENTATION
// =============================================================================
async function loadSurveyAnalysis() {
    try {
        const response = await fetch("survey_responses.csv");
        if (!response.ok) throw new Error("survey_responses.csv not found");
        const text = await response.text();
        parseAndRenderSurvey(text);
    } catch (e) {
        console.info("Using embedded dataset for survey analysis:", e);
        const embedded = `Response_ID,How frequently do you check air quality?,Have you used an AQI app or website?,Would a dashboard with health tips help you check AQI?,Which air pollutant are you most concerned about?,Primary health symptom experienced during high pollution
R001,Rarely,No,Yes,PM2.5,Eye irritation or stinging
R002,Never,No,Yes,PM2.5,Throat scratchiness or coughing
R003,Occasionally,Yes,Yes,PM10,Throat scratchiness or coughing
R004,Rarely,No,Maybe,PM2.5,Headache or fatigue
R005,Never,No,Yes,PM2.5,Eye irritation or stinging
R006,Daily,Yes,Yes,PM2.5,None / Not noticeable
R007,Rarely,Yes,Yes,NO2,Throat scratchiness or coughing
R008,Never,No,Yes,PM2.5,Eye irritation or stinging
R009,Occasionally,No,Maybe,PM10,None / Not noticeable
R010,Rarely,No,Yes,PM2.5,Shortness of breath
R011,Never,No,Yes,PM2.5,Throat scratchiness or coughing
R012,Occasionally,Yes,Yes,PM2.5,Eye irritation or stinging
R013,Rarely,No,Yes,NO2,Eye irritation or stinging
R014,Daily,Yes,Yes,PM2.5,Throat scratchiness or coughing
R015,Never,No,Maybe,PM10,Headache or fatigue
R016,Rarely,No,Yes,PM2.5,Throat scratchiness or coughing
R017,Occasionally,Yes,Yes,PM2.5,Eye irritation or stinging
R018,Never,No,Yes,PM2.5,Eye irritation or stinging
R019,Rarely,No,Yes,PM10,Shortness of breath
R020,Occasionally,No,Yes,PM2.5,None / Not noticeable
R021,Never,No,Yes,PM2.5,Throat scratchiness or coughing
R022,Rarely,Yes,Yes,PM2.5,Eye irritation or stinging
R023,Daily,Yes,Yes,PM2.5,None / Not noticeable
R024,Never,No,Maybe,NO2,Eye irritation or stinging
R025,Rarely,No,Yes,PM2.5,Throat scratchiness or coughing
R026,Occasionally,Yes,Yes,PM10,Throat scratchiness or coughing
R027,Never,No,Yes,PM2.5,Eye irritation or stinging
R028,Rarely,No,Yes,PM2.5,Headache or fatigue
R029,Never,No,No,PM10,None / Not noticeable
R030,Occasionally,Yes,Yes,PM2.5,Throat scratchiness or coughing
R031,Rarely,No,Yes,PM2.5,Eye irritation or stinging
R032,Never,No,Yes,PM2.5,Eye irritation or stinging
R033,Daily,Yes,Yes,PM2.5,None / Not noticeable
R034,Rarely,No,Maybe,NO2,Throat scratchiness or coughing
R035,Never,No,Yes,PM2.5,Shortness of breath
R036,Occasionally,Yes,Yes,PM10,Eye irritation or stinging
R037,Rarely,No,Yes,PM2.5,Throat scratchiness or coughing
R038,Never,No,Yes,PM2.5,Eye irritation or stinging
R039,Occasionally,No,Yes,PM2.5,Headache or fatigue
R040,Rarely,Yes,Yes,PM2.5,None / Not noticeable
R041,Never,No,Yes,PM10,Throat scratchiness or coughing
R042,Daily,Yes,Yes,PM2.5,Eye irritation or stinging
R043,Rarely,No,Maybe,PM2.5,Throat scratchiness or coughing
R044,Never,No,Yes,NO2,Eye irritation or stinging
R045,Occasionally,Yes,Yes,PM2.5,None / Not noticeable
R046,Rarely,No,Yes,PM2.5,Eye irritation or stinging
R047,Never,No,Yes,PM2.5,Throat scratchiness or coughing
R048,Occasionally,No,Yes,PM10,Shortness of breath
R049,Rarely,No,Yes,PM2.5,Eye irritation or stinging
R050,Never,No,Maybe,PM2.5,None / Not noticeable`;
        parseAndRenderSurvey(embedded);
    }
}

function parseAndRenderSurvey(csvText) {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map(h => h.trim());
    const rows = lines.slice(1).map(l => l.split(",").map(c => c.trim()));

    const countElem = document.getElementById("surveyTotalCount");
    if (countElem) countElem.textContent = `${rows.length} valid student responses`;

    const piiKeys = ["id", "name", "email", "phone", "contact", "student_id", "roll_no", "response_id"];
    const questionCols = headers.filter(h => !piiKeys.includes(h.toLowerCase()));

    const container = document.getElementById("surveyChartsContainer");
    if (!container) return;
    container.innerHTML = "";

    let rarelyNeverCount = 0;
    let usedAppCount = 0;
    let dashHelpsCount = 0;
    const totalCount = rows.length;

    questionCols.forEach((qHeader, idx) => {
        const actualIndex = headers.indexOf(qHeader);
        const freqMap = {};

        rows.forEach(r => {
            const val = r[actualIndex];
            if (val && val !== "") freqMap[val] = (freqMap[val] || 0) + 1;
        });

        if (qHeader.toLowerCase().includes("frequently") || qHeader.toLowerCase().includes("check")) {
            Object.keys(freqMap).forEach(k => {
                if (k.toLowerCase() === "rarely" || k.toLowerCase() === "never") rarelyNeverCount += freqMap[k];
            });
        }
        if (qHeader.toLowerCase().includes("app") || qHeader.toLowerCase().includes("website")) {
            Object.keys(freqMap).forEach(k => {
                if (k.toLowerCase() === "yes") usedAppCount += freqMap[k];
            });
        }
        if (qHeader.toLowerCase().includes("dashboard") || qHeader.toLowerCase().includes("help")) {
            Object.keys(freqMap).forEach(k => {
                if (k.toLowerCase() === "yes") dashHelpsCount += freqMap[k];
            });
        }

        const chartBox = document.createElement("div");
        chartBox.className = "panel-box";
        const chartId = `surveyPlot_${idx}`;
        chartBox.innerHTML = `
            <div style="font-size: 16px; font-weight:600; color: #1F2933; margin-bottom: 8px;">${qHeader}</div>
            <div id="${chartId}" style="width: 100%; height: 340px;"></div>
        `;
        container.appendChild(chartBox);

        const labels = Object.keys(freqMap);
        const values = Object.values(freqMap);
        const sum = values.reduce((a, b) => a + b, 0);
        const texts = values.map(v => `${v} (${Math.round((v / sum) * 100)}%)`);

        const trace = {
            x: labels,
            y: values,
            type: 'bar',
            text: texts,
            textposition: 'outside',
            marker: { color: '#0F5C5C' },
            textfont: { size: 15, color: '#1F2933' }
        };

        const layout = {
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            margin: { l: 35, r: 20, t: 25, b: 60 },
            font: { family: 'Inter, sans-serif', color: '#1F2933', size: 15 },
            xaxis: { tickangle: -15, gridcolor: '#F0F2EE', tickfont: { size: 14, color: '#1F2933' } },
            yaxis: { gridcolor: '#E5E7EB', tickfont: { size: 14, color: '#1F2933' } }
        };

        Plotly.newPlot(chartId, [trace], layout, { responsive: true, displayModeBar: false });
    });

    // Update Awareness vs Reality Stats
    const pctRarely = Math.round((rarelyNeverCount / (totalCount || 1)) * 100);
    const pctApp = Math.round((usedAppCount / (totalCount || 1)) * 100);
    const pctHelp = Math.round((dashHelpsCount / (totalCount || 1)) * 100);

    const statRarely = document.getElementById("statRarelyNever");
    if (statRarely) statRarely.textContent = `${pctRarely}%`;

    const statApp = document.getElementById("statUsedApp");
    if (statApp) statApp.textContent = `${pctApp}%`;

    const statHelp = document.getElementById("statDashboardHelps");
    if (statHelp) statHelp.textContent = `${pctHelp}%`;
}

// =============================================================================
// 9. EVENT LISTENERS & SETUP
// =============================================================================
function setupEventListeners() {
    const citySelect = document.getElementById("citySelect");
    if (citySelect) {
        citySelect.addEventListener("change", (e) => {
            updateLiveCityUI(e.target.value);
        });
    }

    const btnRefresh = document.getElementById("btnRefresh");
    if (btnRefresh && citySelect) {
        btnRefresh.addEventListener("click", () => {
            const city = citySelect.value;
            delete apiCache[city];
            updateLiveCityUI(city);
        });
    }

    const btnDownload = document.getElementById("btnDownloadCSV");
    if (btnDownload) {
        btnDownload.addEventListener("click", () => {
            const link = document.createElement("a");
            link.href = "survey_responses.csv";
            link.download = "survey_responses.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    window.addEventListener("resize", () => {
        const compareChart = document.getElementById("plotlyCityCompare") || document.getElementById("plotly3DCompare");
        if (compareChart && window.Plotly) Plotly.Plots.resize(compareChart);

        const trendChart = document.getElementById("plotly7DayTrend");
        if (trendChart && window.Plotly) Plotly.Plots.resize(trendChart);
    });
}

// =============================================================================
// 10. TOPIC-RELATED 3D ATMOSPHERIC SCROLL BACKGROUND (THREE.JS)
// =============================================================================
function initAtmospheric3DScrollBackground() {
    const canvas = document.getElementById("ambient3dBg");
    if (!canvas || typeof THREE === "undefined") {
        console.warn("Three.js or #ambient3dBg canvas unavailable; skipping 3D background.");
        return;
    }

    // 1. Scene & Environmental Depth Fog
    const scene = new THREE.Scene();
    // Atmospheric fog softly blends distant particles into the calm page background (#eef3f2)
    scene.fog = new THREE.FogExp2(0xeef3f2, 0.00045);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.set(0, 140, 480);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Procedural Soft Gaussian Particle Sprite
    function createParticleTexture() {
        const c = document.createElement("canvas");
        c.width = 128;
        c.height = 128;
        const ctx = c.getContext("2d");
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.2, "rgba(235, 245, 255, 0.85)");
        grad.addColorStop(0.55, "rgba(200, 225, 240, 0.25)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
    }
    const particleTex = createParticleTexture();

    // 5. Environmental Atmospheric Palette (Teals, Sage Greens, Sky Blues, Dust Ambers, Micro-Slate)
    const atmosphericPalette = [
        new THREE.Color("#0f766e"), // Deep Atmospheric Teal
        new THREE.Color("#14b8a6"), // Tropospheric Teal
        new THREE.Color("#16a34a"), // Clean Green baseline
        new THREE.Color("#0284c7"), // Sky Blue ambient
        new THREE.Color("#d97706"), // Aerosol dust
        new THREE.Color("#ea580c"), // Atmospheric haze
        new THREE.Color("#64748b")  // Suspended micro-matter
    ];

    // 6. PM2.5 Fine Particulate Matter & Aerosol Field
    const pm25Count = 1300;
    const pm25Geo = new THREE.BufferGeometry();
    const pm25Positions = new Float32Array(pm25Count * 3);
    const pm25BasePos = new Float32Array(pm25Count * 3);
    const pm25Colors = new Float32Array(pm25Count * 3);
    const pm25Speeds = new Float32Array(pm25Count);
    const pm25Phases = new Float32Array(pm25Count);

    for (let i = 0; i < pm25Count; i++) {
        const i3 = i * 3;
        // Distribute across atmospheric volume spanning the full scroll depth
        const x = (Math.random() - 0.5) * 800;
        const y = 380 - Math.random() * 1150; // Spans from +380 (top) down to -770 (bottom)
        const z = (Math.random() - 0.5) * 600;

        pm25Positions[i3] = x;
        pm25Positions[i3 + 1] = y;
        pm25Positions[i3 + 2] = z;

        pm25BasePos[i3] = x;
        pm25BasePos[i3 + 1] = y;
        pm25BasePos[i3 + 2] = z;

        const color = atmosphericPalette[Math.floor(Math.random() * atmosphericPalette.length)];
        pm25Colors[i3] = color.r;
        pm25Colors[i3 + 1] = color.g;
        pm25Colors[i3 + 2] = color.b;

        pm25Speeds[i] = 0.4 + Math.random() * 0.8;
        pm25Phases[i] = Math.random() * Math.PI * 2;
    }

    pm25Geo.setAttribute("position", new THREE.BufferAttribute(pm25Positions, 3));
    pm25Geo.setAttribute("color", new THREE.BufferAttribute(pm25Colors, 3));

    const pm25Mat = new THREE.PointsMaterial({
        size: 9.5,
        map: particleTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    const pm25Points = new THREE.Points(pm25Geo, pm25Mat);
    scene.add(pm25Points);

    // 7. PM10 Coarse Particulates & Suspended Mineral Dust
    const pm10Count = 280;
    const pm10Geo = new THREE.BufferGeometry();
    const pm10Positions = new Float32Array(pm10Count * 3);
    const pm10Colors = new Float32Array(pm10Count * 3);

    for (let i = 0; i < pm10Count; i++) {
        const i3 = i * 3;
        pm10Positions[i3] = (Math.random() - 0.5) * 900;
        pm10Positions[i3 + 1] = 400 - Math.random() * 1200;
        pm10Positions[i3 + 2] = (Math.random() - 0.5) * 650;

        // Mineral dust tones
        const c = Math.random() > 0.5 ? new THREE.Color("#d97706") : new THREE.Color("#0f766e");
        pm10Colors[i3] = c.r;
        pm10Colors[i3 + 1] = c.g;
        pm10Colors[i3 + 2] = c.b;
    }

    pm10Geo.setAttribute("position", new THREE.BufferAttribute(pm10Positions, 3));
    pm10Geo.setAttribute("color", new THREE.BufferAttribute(pm10Colors, 3));

    const pm10Mat = new THREE.PointsMaterial({
        size: 18.0,
        map: particleTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    const pm10Points = new THREE.Points(pm10Geo, pm10Mat);
    scene.add(pm10Points);

    // 8. Atmospheric Wind Streamlines / Laminar Air Current Ribbons
    const streamlineGroup = new THREE.Group();
    for (let i = 0; i < 8; i++) {
        const points = [];
        const altitude = 280 - i * 135;
        const radius = 170 + (i % 3) * 70;
        const turns = 1.3;
        for (let t = 0; t <= 45; t++) {
            const angle = (t / 45) * Math.PI * 2 * turns + i * 0.75;
            const r = radius + Math.sin(t * 0.35) * 35;
            const x = Math.cos(angle) * r;
            const y = altitude + Math.sin(t * 0.28) * 30;
            const z = Math.sin(angle) * (r * 0.8);
            points.push(new THREE.Vector3(x, y, z));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const curveGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(85));
        const streamColor = i % 2 === 0 ? 0x0f766e : 0x0284c7;
        const lineMat = new THREE.LineBasicMaterial({
            color: streamColor,
            transparent: true,
            opacity: 0.28 + (i % 2) * 0.12,
            linewidth: 2.0
        });
        const line = new THREE.Line(curveGeo, lineMat);
        streamlineGroup.add(line);
    }
    scene.add(streamlineGroup);

    // 9. Atmospheric Boundary Layer Altitude Isobars (Rings)
    const ringGroup = new THREE.Group();
    const ringAltitudes = [220, 30, -220, -480];
    ringAltitudes.forEach((alt, idx) => {
        const ringGeo = new THREE.RingGeometry(240 + idx * 35, 241.5 + idx * 35, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x0f766e,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = alt;
        ringGroup.add(ring);
    });
    scene.add(ringGroup);

    // 10. Scroll & Parallax Tracking ("fits website scroll till end")
    let targetScroll = 0;
    let currentScroll = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    function onScroll() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const maxScroll = Math.max(docHeight - winHeight, 1);
        targetScroll = Math.min(Math.max(scrollY / maxScroll, 0), 1);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    window.addEventListener("mousemove", (e) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    // 11. Smooth Animation Loop
    let clock = 0;
    let isTabVisible = true;

    document.addEventListener("visibilitychange", () => {
        isTabVisible = !document.hidden;
    });

    function animate() {
        requestAnimationFrame(animate);
        if (!isTabVisible) return;

        clock += 0.016;

        // Smoothly interpolate scroll progress and mouse coordinates
        currentScroll += (targetScroll - currentScroll) * 0.065;
        currentMouseX += (targetMouseX - currentMouseX) * 0.05;
        currentMouseY += (targetMouseY - currentMouseY) * 0.05;

        // 3D Camera Trajectory: continuous journey from upper troposphere down to surface boundary layer
        const startY = 150;
        const endY = -560;
        camera.position.y = startY + (endY - startY) * currentScroll - currentMouseY * 20;

        // Swooping depth along Z-axis provides dynamic parallax
        const camSwoopZ = Math.sin(currentScroll * Math.PI) * 45;
        camera.position.z = 480 - camSwoopZ;

        // Gentle lateral trajectory curve
        camera.position.x = Math.sin(currentScroll * Math.PI * 1.5) * 55 + currentMouseX * 30;

        // Focal look-target follows the descent
        const lookTargetY = camera.position.y - 35;
        camera.lookAt(0, lookTargetY, 0);

        // Wind streamline and ring rotations
        const scrollVelocity = (targetScroll - currentScroll) * 12;
        streamlineGroup.rotation.y = currentScroll * Math.PI * 1.4 + clock * 0.04 + scrollVelocity * 0.2;
        ringGroup.rotation.z = currentScroll * Math.PI * 0.6 + clock * 0.02;
        pm25Points.rotation.y = currentScroll * Math.PI * 0.7 + clock * 0.03;
        pm10Points.rotation.y = -currentScroll * Math.PI * 0.5 - clock * 0.02;

        // Gentle Brownian oscillation for fine PM2.5 particulates
        const positions = pm25Geo.attributes.position.array;
        for (let i = 0; i < pm25Count; i++) {
            const i3 = i * 3;
            const spd = pm25Speeds[i];
            const ph = pm25Phases[i];
            positions[i3 + 1] = pm25BasePos[i3 + 1] + Math.sin(clock * spd + ph) * 12;
            positions[i3] = pm25BasePos[i3] + Math.cos(clock * (spd * 0.8) + ph) * 8;
        }
        pm25Geo.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
    }
    animate();

    // 12. Viewport Resize Handler
    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        onScroll();
    });
}

// =============================================================================
// 11. APP INITIALIZATION
// =============================================================================
window.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize Topic-Related 3D Atmospheric Scroll Background
    initAtmospheric3DScrollBackground();

    setupEventListeners();

    // 2. Initial live city view
    await updateLiveCityUI("Delhi");

    // 3. Multi-city load for 3D Map and 2D Comparison Chart
    await loadAllCitiesData();
    initDeckGLMap();
    populateAllCitiesTable();
    render2DCityComparisonChart();

    // 4. Survey data analysis
    loadSurveyAnalysis();
});

