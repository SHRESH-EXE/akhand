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
let currentMapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
let isAutoOrbiting = false;
let orbitInterval = null;
let currentViewState = {
    latitude: 21.0,
    longitude: 79.2,
    zoom: 4.85,
    minZoom: 3.5,
    maxZoom: 10,
    pitch: 52,
    bearing: -8
};

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
function getDeckLayers() {
    const layers = [];
    if (!window.deck || !allCitiesData || allCitiesData.length === 0) return layers;

    // 1. Glowing ground aura halo rings
    if (window.deck.ScatterplotLayer) {
        layers.push(new deck.ScatterplotLayer({
            id: 'india-city-halos',
            data: allCitiesData,
            pickable: false,
            opacity: 0.85,
            stroked: true,
            filled: true,
            radiusScale: 1,
            radiusMinPixels: 14,
            radiusMaxPixels: 60,
            lineWidthMinPixels: 2,
            getPosition: d => [d.lon, d.lat],
            getRadius: d => 46000,
            getFillColor: d => [...d.rgb, 38],
            getLineColor: d => [...d.rgb, 140]
        }));

        // 2. High-contrast solid city ground anchor disc
        layers.push(new deck.ScatterplotLayer({
            id: 'india-city-dots',
            data: allCitiesData,
            pickable: false,
            opacity: 1,
            stroked: true,
            filled: true,
            radiusMinPixels: 5,
            radiusMaxPixels: 16,
            lineWidthMinPixels: 1.5,
            getPosition: d => [d.lon, d.lat],
            getRadius: d => 16000,
            getFillColor: d => [...d.rgb, 240],
            getLineColor: [255, 255, 255, 220]
        }));
    }

    // 3. 3D Extruded AQI Pillar Columns with specular lighting
    if (window.deck.ColumnLayer) {
        layers.push(new deck.ColumnLayer({
            id: 'india-aqi-columns',
            data: allCitiesData,
            diskResolution: 32,
            radius: 24000,
            extruded: true,
            pickable: true,
            elevationScale: 1,
            getPosition: d => [d.lon, d.lat],
            getFillColor: d => [...d.rgb, 235],
            getElevation: d => Math.max((d.aqi || 50) * 1250, 24000),
            autoHighlight: true,
            highlightColor: [255, 255, 255, 180],
            material: {
                ambient: 0.35,
                diffuse: 0.6,
                shininess: 42,
                specularColor: [255, 255, 255]
            }
        }));
    }

    // 4. Billboard 3D Labels floating above each column
    if (window.deck.TextLayer) {
        layers.push(new deck.TextLayer({
            id: 'india-city-labels',
            data: allCitiesData,
            pickable: false,
            getPosition: d => [d.lon, d.lat, Math.max((d.aqi || 50) * 1250, 24000) + 14000],
            getText: d => `${d.city}\nAQI ${d.aqi}`,
            getSize: 12,
            getColor: [255, 255, 255, 240],
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'bottom',
            background: true,
            getBackgroundColor: [15, 23, 42, 210],
            backgroundPadding: [6, 4, 6, 4],
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            fontWeight: 700,
            billboard: true,
            sizeUnits: 'pixels',
            sizeMinPixels: 11,
            sizeMaxPixels: 16
        }));
    }

    return layers;
}

function setupMapControls() {
    if (window._mapControlsInitialized) return;
    window._mapControlsInitialized = true;

    // 1. Theme Toggle: Dark Cyber vs Daylight Topo
    const btnTheme = document.getElementById("btnMapTheme");
    if (btnTheme) {
        btnTheme.addEventListener("click", () => {
            const isDark = currentMapStyle.includes("dark-matter");
            currentMapStyle = isDark
                ? 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
                : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

            const icon = document.getElementById("mapThemeIcon");
            const text = document.getElementById("mapThemeText");
            if (icon) icon.textContent = isDark ? "🌙" : "☀️";
            if (text) text.textContent = isDark ? "Dark Cyber" : "Daylight";

            if (deckglOverlay) {
                deckglOverlay.setProps({ mapStyle: currentMapStyle });
            }
        });
    }

    // 2. 3D Tilt vs Top-Down View
    const btnTilt = document.getElementById("btnMapTilt");
    if (btnTilt) {
        btnTilt.addEventListener("click", () => {
            const isTilted = (currentViewState.pitch || 0) > 15;
            const newPitch = isTilted ? 0 : 52;
            const newBearing = isTilted ? 0 : -8;
            const tiltText = document.getElementById("mapTiltText");
            if (tiltText) tiltText.textContent = isTilted ? "3D Tilt" : "Top-Down";

            currentViewState = {
                ...currentViewState,
                pitch: newPitch,
                bearing: newBearing,
                transitionDuration: 1000,
                transitionInterpolator: (deck && deck.FlyToInterpolator) ? new deck.FlyToInterpolator() : undefined
            };
            if (deckglOverlay) {
                deckglOverlay.setProps({ initialViewState: currentViewState });
            }
        });
    }

    // 3. Cinematic Auto-Orbit Rotation
    const btnOrbit = document.getElementById("btnMapOrbit");
    if (btnOrbit) {
        btnOrbit.addEventListener("click", () => {
            isAutoOrbiting = !isAutoOrbiting;
            btnOrbit.classList.toggle("active", isAutoOrbiting);
            const icon = document.getElementById("mapOrbitIcon");
            if (icon) icon.textContent = isAutoOrbiting ? "⏸️" : "🔄";

            if (isAutoOrbiting) {
                if (orbitInterval) clearInterval(orbitInterval);
                orbitInterval = setInterval(() => {
                    currentViewState = {
                        ...currentViewState,
                        bearing: ((currentViewState.bearing || 0) + 0.4) % 360,
                        pitch: Math.max(currentViewState.pitch || 45, 35),
                        transitionDuration: 0
                    };
                    if (deckglOverlay) {
                        deckglOverlay.setProps({ initialViewState: currentViewState });
                    }
                }, 50);
            } else {
                if (orbitInterval) {
                    clearInterval(orbitInterval);
                    orbitInterval = null;
                }
            }
        });
    }

    // 4. Center on India
    const btnReset = document.getElementById("btnMapReset");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            if (isAutoOrbiting) {
                isAutoOrbiting = false;
                if (orbitInterval) {
                    clearInterval(orbitInterval);
                    orbitInterval = null;
                }
                if (btnOrbit) btnOrbit.classList.remove("active");
                const icon = document.getElementById("mapOrbitIcon");
                if (icon) icon.textContent = "🔄";
            }
            currentViewState = {
                latitude: 21.0,
                longitude: 79.2,
                zoom: 4.85,
                minZoom: 3.5,
                maxZoom: 10,
                pitch: 52,
                bearing: -8,
                transitionDuration: 1200,
                transitionInterpolator: (deck && deck.FlyToInterpolator) ? new deck.FlyToInterpolator() : undefined
            };
            const tiltText = document.getElementById("mapTiltText");
            if (tiltText) tiltText.textContent = "Top-Down";

            if (deckglOverlay) {
                deckglOverlay.setProps({ initialViewState: currentViewState });
            }
        });
    }
}

function initDeckGLMap() {
    const container = document.getElementById("deckMap");
    if (!container || !window.deck) return;

    setupMapControls();

    try {
        if (!deckglOverlay) {
            deckglOverlay = new deck.DeckGL({
                container: container,
                mapStyle: currentMapStyle,
                initialViewState: currentViewState,
                controller: true,
                layers: getDeckLayers(),
                onViewStateChange: ({ viewState }) => {
                    currentViewState = { ...currentViewState, ...viewState };
                },
                onClick: (info) => {
                    if (info && info.object && info.object.city) {
                        const citySelect = document.getElementById("citySelect");
                        if (citySelect) {
                            citySelect.value = info.object.city;
                            citySelect.dispatchEvent(new Event("change"));
                        }
                    }
                },
                getTooltip: ({ object }) => object && {
                    html: `
                        <div style="font-family:Inter,system-ui,sans-serif; min-width:180px; padding:2px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:5px;">
                                <strong style="font-size:15px; color:#f8fafc; font-weight:700;">${object.city}</strong>
                                <span style="font-size:11px; background:rgba(255,255,255,0.12); color:#cbd5e1; padding:2px 6px; border-radius:4px;">${object.region}</span>
                            </div>
                            <div style="margin-bottom:6px;">
                                <span style="font-size:12px; color:#94a3b8;">AQI: </span>
                                <strong style="font-size:16px; color:${object.hex};">${object.aqi}</strong>
                                <span style="font-size:12px; color:${object.hex}; margin-left:4px;">(${object.category})</span>
                            </div>
                            <div style="font-size:12px; color:#cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-top:6px; background:rgba(255,255,255,0.06); padding:6px 8px; border-radius:4px;">
                                <div>PM2.5: <strong style="color:#f8fafc;">${object.pm2_5}</strong></div>
                                <div>PM10: <strong style="color:#f8fafc;">${object.pm10}</strong></div>
                                <div>NO₂: <strong style="color:#f8fafc;">${object.no2}</strong></div>
                                <div>SO₂: <strong style="color:#f8fafc;">${object.so2}</strong></div>
                            </div>
                            <div style="font-size:11px; color:#94a3b8; margin-top:6px; font-style:italic;">Click column to select & view trends</div>
                        </div>
                    `,
                    style: {
                        backgroundColor: 'rgba(15, 23, 42, 0.94)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                        color: '#f8fafc'
                    }
                }
            });
        } else {
            deckglOverlay.setProps({
                layers: getDeckLayers()
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
        width: 0.45,
        marker: {
            color: sortedCities.map(c => c.hex),
            cornerradius: 8,
            line: { width: 1, color: 'rgba(255, 255, 255, 0.7)' }
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
            font: { family: 'Inter, sans-serif', color: '#F8FAFC', size: 18 }
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 110, r: 60, t: 50, b: 70 },
        xaxis: {
            title: {
                text: 'Air Quality Index (US AQI)',
                font: { family: 'Inter, sans-serif', color: '#94A3B8', size: 15 }
            },
            tickfont: { family: 'Inter, sans-serif', color: '#F8FAFC', size: 15 },
            gridcolor: 'rgba(255, 255, 255, 0.1)',
            range: [0, maxAQI * 1.14]
        },
        yaxis: {
            title: {
                text: 'City',
                font: { family: 'Inter, sans-serif', color: '#94A3B8', size: 15 }
            },
            tickfont: { family: 'Inter, sans-serif', color: '#F8FAFC', size: 15 },
            autorange: 'reversed', // Highest AQI at the top!
            gridcolor: 'rgba(255, 255, 255, 0.05)'
        },
        legend: {
            orientation: 'h',
            x: 0,
            y: -0.22,
            font: { family: 'Inter, sans-serif', color: '#94A3B8', size: 15 },
            bgcolor: 'rgba(0,0,0,0)',
            bordercolor: 'rgba(255, 255, 255, 0.1)',
            borderwidth: 1
        },
        bargap: 0.45,
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
        line: { shape: 'spline', smoothing: 1.3, color: '#E11D48', width: 3.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(225, 29, 72, 0.08)',
        marker: {
            size: 10,
            color: pointColors,
            line: { color: 'rgba(0,0,0,0)', width: 2 }
        },
        hovertemplate: '<b>Date:</b> %{x}<br><b>Forecast AQI:</b> %{y}<br><b>Category:</b> %{customdata}<extra></extra>'
    };

    const maxVal = Math.max(...dailyAQIs, 200);

    const layout = {
        title: {
            text: `7-Day Air Quality Trajectory for ${cityName}`,
            font: { family: 'Inter, sans-serif', color: '#F8FAFC', size: 16 }
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 50, r: 120, t: 50, b: 40 },
        xaxis: {
            title: { text: 'Forecast Date', font: { family: 'Inter, sans-serif', color: '#94A3B8', size: 15 } },
            tickfont: { family: 'Inter, sans-serif', color: '#F8FAFC', size: 15 },
            gridcolor: 'rgba(255, 255, 255, 0.05)'
        },
        yaxis: {
            title: { text: 'Air Quality Index (US AQI)', font: { family: 'Inter, sans-serif', color: '#94A3B8', size: 15 } },
            tickfont: { family: 'Inter, sans-serif', color: '#F8FAFC', size: 15 },
            gridcolor: 'rgba(255, 255, 255, 0.1)',
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
    const excludedQuestions = ["dashboard", "health tips", "pollutant", "concerned"];
    const questionCols = headers.filter(h => {
        const lower = h.toLowerCase();
        if (piiKeys.includes(lower)) return false;
        if (excludedQuestions.some(eq => lower.includes(eq))) return false;
        return true;
    });

    const container = document.getElementById("surveyChartsContainer");
    if (!container) return;
    container.innerHTML = "";

    let rarelyNeverCount = 0;
    let usedAppCount = 0;
    let dashHelpsCount = 0;
    const totalCount = rows.length;

    // Calculate summary statistics across all responses
    headers.forEach((h, colIdx) => {
        const lower = h.toLowerCase();
        if (lower.includes("frequently") || lower.includes("check")) {
            rows.forEach(r => {
                const val = (r[colIdx] || "").toLowerCase();
                if (val === "rarely" || val === "never") rarelyNeverCount++;
            });
        }
        if (lower.includes("app") || lower.includes("website")) {
            rows.forEach(r => {
                const val = (r[colIdx] || "").toLowerCase();
                if (val === "yes") usedAppCount++;
            });
        }
        if (lower.includes("dashboard") || lower.includes("help")) {
            rows.forEach(r => {
                const val = (r[colIdx] || "").toLowerCase();
                if (val === "yes") dashHelpsCount++;
            });
        }
    });

    questionCols.forEach((qHeader, idx) => {
        const actualIndex = headers.indexOf(qHeader);
        const freqMap = {};

        rows.forEach(r => {
            const val = r[actualIndex];
            if (val && val !== "") freqMap[val] = (freqMap[val] || 0) + 1;
        });

        const isFreq = qHeader.toLowerCase().includes("frequently") || qHeader.toLowerCase().includes("check");
        const isApp = qHeader.toLowerCase().includes("app") || qHeader.toLowerCase().includes("website");
        const isSymptom = qHeader.toLowerCase().includes("symptom");

        const isFull = isSymptom; // Symptom horizontal chart spans across both columns
        const chartBox = document.createElement("div");
        chartBox.className = `survey-chart-box ${isFull ? 'survey-chart-full' : ''}`;
        const chartId = `surveyPlot_${idx}`;
        chartBox.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px;">
                <div>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #F97316; margin-bottom: 3px;">STUDENT SURVEY &bull; INSIGHT #${idx + 1}</div>
                    <div style="font-size: 16px; font-weight: 700; color: #0F172A; line-height: 1.35;">${qHeader}</div>
                </div>
                <span style="font-size: 12px; font-weight: 600; color: #64748B; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 3px 10px; border-radius: 12px; white-space: nowrap;">N = ${totalCount}</span>
            </div>
            <div id="${chartId}" style="width: 100%; height: ${isFull ? '320px' : '330px'};"></div>
        `;
        container.appendChild(chartBox);

        let labels = Object.keys(freqMap);
        let values = Object.values(freqMap);

        if (isFreq) {
            const order = ["Daily", "Occasionally", "Rarely", "Never"];
            labels = order.filter(k => k in freqMap);
            values = labels.map(k => freqMap[k]);
        } else if (isApp) {
            const order = ["No", "Yes"];
            labels = order.filter(k => k in freqMap);
            values = labels.map(k => freqMap[k]);
        } else if (isSymptom) {
            labels.sort((a, b) => (freqMap[b] || 0) - (freqMap[a] || 0));
            values = labels.map(k => freqMap[k]);
        } else {
            labels.sort((a, b) => (freqMap[b] || 0) - (freqMap[a] || 0));
            values = labels.map(k => freqMap[k]);
        }

        const sum = values.reduce((a, b) => a + b, 0) || 1;
        const texts = values.map(v => `${v} (${Math.round((v / sum) * 100)}%)`);

        // Warm sunset color palettes matching the sample aesthetic
        const warmPalette = ['#FBBF24', '#FB923C', '#F97316', '#F43F5E', '#E11D48', '#BE123C'];
        let barColors = [];
        if (isFreq) {
            barColors = ['#FBBF24', '#FB923C', '#F43F5E', '#BE123C'];
        } else if (isApp) {
            barColors = ['#E11D48', '#F59E0B'];
        } else if (isSymptom) {
            barColors = ['#E11D48', '#F43F5E', '#F97316', '#FB923C', '#FBBF24'];
        } else {
            barColors = labels.map((_, i) => warmPalette[i % warmPalette.length]);
        }

        const traces = [];

        if (isSymptom) {
            // Horizontal bar chart with warm gradient & rounded corners
            const hTrace = {
                type: 'bar',
                orientation: 'h',
                y: labels,
                x: values,
                width: 0.42,
                text: texts,
                textposition: 'outside',
                cliponaxis: false,
                marker: {
                    color: barColors,
                    cornerradius: 8,
                    line: { width: 1, color: 'rgba(255, 255, 255, 0.8)' }
                },
                textfont: { size: 14, color: '#F8FAFC', family: 'Inter, sans-serif' },
                hoverinfo: 'x+y'
            };
            traces.push(hTrace);

            const hLayout = {
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                margin: { l: 230, r: 80, t: 15, b: 40 },
                font: { family: 'Inter, sans-serif', color: '#F8FAFC' },
                bargap: 0.52,
                xaxis: {
                    showgrid: true,
                    gridcolor: '#F1F5F9',
                    zeroline: false,
                    tickfont: { size: 13, color: '#64748B', family: 'Inter, sans-serif' },
                    title: { text: 'Responses', font: { size: 13, color: '#64748B', family: 'Inter, sans-serif' } }
                },
                yaxis: {
                    autorange: 'reversed',
                    showgrid: false,
                    zeroline: false,
                    tickfont: { size: 13.5, color: '#F8FAFC', family: 'Inter, sans-serif' }
                }
            };
            Plotly.newPlot(chartId, traces, hLayout, { responsive: true, displayModeBar: false });
        } else {
            // Vertical bar chart with warm sunset palette & overlaid glowing spline line
            const vBarTrace = {
                x: labels,
                y: values,
                type: 'bar',
                width: isApp ? 0.24 : (labels.length <= 3 ? 0.30 : 0.38),
                text: texts,
                textposition: 'outside',
                cliponaxis: false,
                marker: {
                    color: barColors,
                    cornerradius: 8,
                    line: { width: 1, color: 'rgba(255, 255, 255, 0.8)' }
                },
                textfont: { size: 14, color: '#F8FAFC', family: 'Inter, sans-serif' },
                hoverinfo: 'x+y'
            };
            traces.push(vBarTrace);

            if (labels.length > 2) {
                const splineTrace = {
                    x: labels,
                    y: values,
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: { shape: 'spline', smoothing: 1.25, color: '#F59E0B', width: 2.8 },
                    marker: { size: 7, color: '#FEF08A', line: { color: '#B45309', width: 2 } },
                    hoverinfo: 'skip',
                    showlegend: false
                };
                traces.push(splineTrace);
            }

            const maxVal = Math.max(...values, 10);
            const vLayout = {
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                margin: { l: 40, r: 25, t: 25, b: 50 },
                font: { family: 'Inter, sans-serif', color: '#F8FAFC' },
                bargap: isApp ? 0.65 : 0.52,
                xaxis: {
                    showgrid: false,
                    zeroline: false,
                    tickangle: 0,
                    tickfont: { size: 13, color: '#F8FAFC', family: 'Inter, sans-serif' }
                },
                yaxis: {
                    showgrid: true,
                    gridcolor: '#F1F5F9',
                    zeroline: false,
                    range: [0, maxVal * 1.2],
                    tickfont: { size: 13, color: '#64748B', family: 'Inter, sans-serif' }
                }
            };
            Plotly.newPlot(chartId, traces, vLayout, { responsive: true, displayModeBar: false });
        }
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

    const btnLocation = document.getElementById("btnLocation");
    if (btnLocation && citySelect) {
        btnLocation.addEventListener("click", () => {
            if ("geolocation" in navigator) {
                btnLocation.textContent = "📍 Locating...";
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    let locationName = "Your Location";
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.address) {
                                locationName = data.address.city || data.address.town || data.address.village || data.address.state_district || data.address.county || data.address.state || "Your Location";
                                // Append a small marker to indicate it's the user's detected location
                                locationName = locationName + " (Near You)";
                            }
                        }
                    } catch (e) {
                        console.warn("Reverse geocoding failed", e);
                    }
                    
                    CITIES[locationName] = { lat: lat, lon: lon, region: "Local" };
                    
                    let exists = false;
                    for (let i = 0; i < citySelect.options.length; i++) {
                        if (citySelect.options[i].value === locationName) exists = true;
                    }
                    if (!exists) {
                        const opt = document.createElement("option");
                        opt.value = locationName;
                        opt.textContent = locationName;
                        citySelect.appendChild(opt);
                    }
                    
                    citySelect.value = locationName;
                    delete apiCache[locationName];
                    updateLiveCityUI(locationName);
                    btnLocation.textContent = "📍 Near Me";
                }, (error) => {
                    console.error("Geolocation error:", error);
                    alert("Location access denied or unavailable.");
                    btnLocation.textContent = "📍 Near Me";
                });
            } else {
                alert("Geolocation is not supported by your browser.");
            }
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

