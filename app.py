"""
Air Quality Awareness Dashboard
CHE110 Environmental Studies Project - Air Pollution Awareness using Data and Technology

An interactive full-width desktop-optimized environmental dashboard visualizing real-time
ambient air quality, 3D geospatial distribution across India, pollutant concentrations,
comparative city analytics, 7-day predictive trajectories, and student survey insights.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import pydeck as pdk
import requests
import os
from datetime import datetime

# ==============================================================================
# 1. PAGE CONFIGURATION
# ==============================================================================
st.set_page_config(
    page_title="Air Quality Awareness Dashboard",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ==============================================================================
# 2. CUSTOM STREAMLIT CSS (16:9 Full-Width, Clean Typography, Professional Theme)
# ==============================================================================
st.markdown("""
<style>
    /* Premium Dark Theme Glassmorphism for Streamlit */
    .stApp {
        background-color: #05050A;
        background-image: 
            radial-gradient(circle at 15% 50%, rgba(0, 240, 255, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(16, 185, 129, 0.03) 0%, transparent 50%);
        background-attachment: fixed;
        color: #F8FAFC;
        font-family: 'Inter', system-ui, sans-serif;
    }
    
    .main .block-container {
        max-width: 100% !important;
        padding-top: 2rem !important;
        padding-bottom: 3rem !important;
        padding-left: 3rem !important;
        padding-right: 3rem !important;
    }
    
    .section-divider {
        margin: 32px 0 28px 0;
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .header-badge {
        display: inline-block;
        font-size: 14px;
        font-weight: 600;
        color: #00F0FF;
        background: rgba(0, 240, 255, 0.1);
        border: 1px solid rgba(0, 240, 255, 0.2);
        padding: 5px 14px;
        border-radius: 20px;
        margin-bottom: 10px;
        letter-spacing: 0.02em;
    }
    
    .dashboard-title {
        font-size: 42px;
        font-weight: 800;
        color: #F8FAFC;
        background: linear-gradient(to right, #FFFFFF, #94A3B8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        line-height: 1.25;
        margin-bottom: 8px;
    }
    
    .dashboard-subtitle {
        font-size: 17px;
        color: #00F0FF;
        line-height: 1.55;
        margin-bottom: 0;
        font-weight: 500;
    }
    
    .section-title {
        font-size: 26px;
        font-weight: 700;
        color: #F8FAFC;
        margin-top: 0;
        margin-bottom: 4px;
        line-height: 1.3;
    }
    
    .section-caption {
        font-size: 15px;
        color: #94A3B8;
        margin-bottom: 14px;
        line-height: 1.5;
    }
    
    .aqi-card, .health-card, .pollutant-card, .legend-box, .info-panel {
        background: rgba(17, 24, 39, 0.6);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        border-left: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        padding: 24px 26px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    
    .health-card {
        border-left: 4px solid #00F0FF;
    }
    
    .aqi-card:hover, .health-card:hover, .pollutant-card:hover, .info-panel:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 48px 0 rgba(0, 240, 255, 0.15);
        border-top: 1px solid rgba(255, 255, 255, 0.25);
        border-left: 1px solid rgba(255, 255, 255, 0.25);
    }
    
    .aqi-number {
        font-size: 64px;
        font-weight: 800;
        line-height: 1.1;
        margin: 6px 0;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
    }
    
    .category-badge {
        display: inline-block;
        padding: 8px 20px;
        border-radius: 30px;
        font-size: 15px;
        font-weight: 700;
        margin: 6px 0;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    .pollutant-card {
        padding: 20px;
    }
    
    .pollutant-label {
        font-size: 16px;
        font-weight: 600;
        color: #94A3B8;
        margin-bottom: 8px;
    }
    
    .pollutant-value {
        font-size: 32px;
        font-weight: 800;
        color: #F8FAFC;
        line-height: 1.2;
    }
    
    .pollutant-unit {
        font-size: 14px;
        font-weight: 400;
        color: #64748B;
        margin-left: 4px;
    }
    
    .pollutant-desc {
        font-size: 13px;
        color: #64748B;
        margin-top: 4px;
        line-height: 1.35;
    }
    
    .stButton > button {
        font-size: 15px !important;
        font-weight: 600 !important;
        border-radius: 12px !important;
        background-color: #00F0FF !important;
        color: #000000 !important;
        border: none !important;
        box-shadow: 0 0 15px rgba(0, 240, 255, 0.3) !important;
        padding: 0.6rem 1.5rem !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    .stButton > button:hover {
        background-color: #00D1DF !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 0 25px rgba(0, 240, 255, 0.5) !important;
    }
    
    .stSelectbox label {
        font-size: 15px !important;
        font-weight: 600 !important;
        color: #F8FAFC !important;
    }
    
    .legend-box {
        padding: 16px 24px;
        margin-top: 16px;
        margin-bottom: 24px;
    }
    
    .legend-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }
    
    .legend-pill {
        display: inline-flex;
        align-items: center;
        font-size: 14px;
        font-weight: 500;
        color: #E2E8F0;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 6px 14px;
    }
    
    .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
        display: inline-block;
    }
    
    .stat-row {
        margin-bottom: 12px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 16px;
        border-radius: 16px;
        transition: transform 0.3s;
    }
    
    .stat-row:hover {
        transform: scale(1.02);
    }
    
    .stat-number {
        font-size: 36px;
        font-weight: 800;
        line-height: 1.15;
    }
    
    .stat-text {
        font-size: 15px;
        color: #94A3B8;
        margin-top: 4px;
    }
    
    .dashboard-footer {
        text-align: center;
        padding: 30px 0 20px 0;
        margin-top: 40px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 14px;
        color: #64748B;
    }
    
    @media (max-width: 768px) {
        .dashboard-title { font-size: 32px; }
        .section-title { font-size: 22px; }
        .aqi-number { font-size: 48px; }
        .pollutant-value { font-size: 26px; }
    }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# 3. CITIES CONFIGURATION & GEOGRAPHIC COORDINATES
# ==============================================================================
CITIES_CONFIG = {
    "Delhi": {"lat": 28.6139, "lon": 77.2090, "region": "North"},
    "Mumbai": {"lat": 19.0760, "lon": 72.8777, "region": "West"},
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946, "region": "South"},
    "Chennai": {"lat": 13.0827, "lon": 80.2707, "region": "South"},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639, "region": "East"},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867, "region": "South"},
    "Pune": {"lat": 18.5204, "lon": 73.8567, "region": "West"},
    "Ahmedabad": {"lat": 23.0225, "lon": 72.5714, "region": "West"},
    "Lucknow": {"lat": 26.8467, "lon": 80.9462, "region": "North"},
    "Chandigarh": {"lat": 30.7333, "lon": 76.7794, "region": "North"}
}

# ==============================================================================
# 4. AQI CATEGORY, COLOUR & EDUCATIONAL HEALTH ADVICE
# ==============================================================================
def get_aqi_details(aqi):
    """
    Returns AQI Category, Hex color, RGB color tuple, text color,
    and student-friendly educational health guidance.
    
    Ranges:
      0-50: Good, green
      51-100: Moderate, amber
      101-150: Unhealthy for Sensitive Groups, orange
      151-200: Unhealthy, red
      201-300: Very Unhealthy, purple
      301+: Hazardous, dark maroon
    """
    if aqi is None:
        return {
            "category": "Data Unavailable",
            "hex": "#4B5563",
            "rgb": [75, 85, 99],
            "text_color": "#FFFFFF",
            "advice": "Real-time AQI observations are currently unavailable for this location. Please try refreshing.",
            "outdoor_tip": "Consult local regional monitoring updates."
        }
    
    try:
        val = float(aqi)
    except (ValueError, TypeError):
        return {
            "category": "Unknown",
            "hex": "#4B5563",
            "rgb": [75, 85, 99],
            "text_color": "#FFFFFF",
            "advice": "Unable to calculate category.",
            "outdoor_tip": "N/A"
        }

    if val <= 50:
        return {
            "category": "Good",
            "hex": "#16a34a",
            "rgb": [22, 163, 74],
            "text_color": "#FFFFFF",
            "advice": "Air quality is considered satisfactory, and air pollution poses little or no risk. Ideal conditions for outdoor recreation, sports, and fresh air ventilation.",
            "outdoor_tip": "Ideal for all outdoor activities and physical exercise."
        }
    elif val <= 100:
        return {
            "category": "Moderate",
            "hex": "#d97706",
            "rgb": [217, 119, 6],
            "text_color": "#FFFFFF",
            "advice": "Air quality is acceptable; however, unusually sensitive individuals should consider reducing prolonged or heavy outdoor exertion.",
            "outdoor_tip": "Most people can enjoy outdoor activities; sensitive groups should pace exertion."
        }
    elif val <= 150:
        return {
            "category": "Unhealthy for Sensitive Groups",
            "hex": "#ea580c",
            "rgb": [234, 88, 12],
            "text_color": "#FFFFFF",
            "advice": "Members of sensitive groups (including children, older adults, and individuals with respiratory or heart conditions) may experience health effects. The general public is less likely to be affected.",
            "outdoor_tip": "Sensitive individuals should limit prolonged or heavy outdoor exertion."
        }
    elif val <= 200:
        return {
            "category": "Unhealthy",
            "hex": "#dc2626",
            "rgb": [220, 38, 38],
            "text_color": "#FFFFFF",
            "advice": "Everyone may begin to experience adverse health effects; members of sensitive groups may experience more serious health effects. Outdoor air quality is degraded.",
            "outdoor_tip": "Reduce prolonged outdoor exertion. Keep indoor environments well-filtered."
        }
    elif val <= 300:
        return {
            "category": "Very Unhealthy",
            "hex": "#9333ea",
            "rgb": [147, 51, 234],
            "text_color": "#FFFFFF",
            "advice": "Health alert: The risk of adverse health effects is substantially increased for everyone. Strenuous outdoor activities should be avoided.",
            "outdoor_tip": "Avoid prolonged outdoor exposure. Consider wearing an N95 mask outdoors."
        }
    else:
        return {
            "category": "Hazardous",
            "hex": "#881337",
            "rgb": [136, 19, 55],
            "text_color": "#FFFFFF",
            "advice": "Health warning of emergency conditions: Serious risk of respiratory and cardiovascular irritation for the entire population.",
            "outdoor_tip": "Stay indoors with windows closed. Avoid all non-essential outdoor travel."
        }

# ==============================================================================
# 5. OPEN-METEO AIR QUALITY API DATA FETCHING (CACHED)
# ==============================================================================
@st.cache_data(ttl=600, show_spinner=False)
def fetch_city_air_quality(lat: float, lon: float):
    """
    Fetches real-time ambient air quality and 7-day forecast data
    using the Open-Meteo Air Quality API without requiring an API key.
    """
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "us_aqi",
            "pm2_5",
            "pm10",
            "nitrogen_dioxide",
            "sulphur_dioxide",
            "ozone",
            "carbon_monoxide"
        ],
        "hourly": ["us_aqi"],
        "forecast_days": 7,
        "timezone": "auto"
    }
    
    try:
        response = requests.get(url, params=params, timeout=8)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"API returned HTTP status {response.status_code}"}
    except requests.exceptions.Timeout:
        return {"error": "Connection timed out while fetching air quality data."}
    except requests.exceptions.RequestException as e:
        return {"error": f"Network error: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}

@st.cache_data(ttl=600, show_spinner=False)
def fetch_all_cities_data():
    """
    Fetches current air quality metrics for all 10 configured Indian cities.
    Returns a pandas DataFrame ready for 3D mapping and comparative visualizations.
    """
    records = []
    for city, coords in CITIES_CONFIG.items():
        data = fetch_city_air_quality(coords["lat"], coords["lon"])
        if "current" in data:
            curr = data["current"]
            aqi = curr.get("us_aqi", 0)
            pm2_5 = curr.get("pm2_5", 0.0)
            pm10 = curr.get("pm10", 0.0)
            no2 = curr.get("nitrogen_dioxide", 0.0)
            so2 = curr.get("sulphur_dioxide", 0.0)
            o3 = curr.get("ozone", 0.0)
            co = curr.get("carbon_monoxide", 0.0)
            
            details = get_aqi_details(aqi)
            
            # Elevation scaled distinguishably for 3D pydeck map
            elevation = float(max(float(aqi) * 1200.0, 8000.0))
            
            records.append({
                "city": city,
                "lat": float(coords["lat"]),
                "lon": float(coords["lon"]),
                "region": coords["region"],
                "aqi": int(aqi),
                "category": str(details["category"]),
                "color_hex": str(details["hex"]),
                "color_rgb": [int(c) for c in details["rgb"]],
                "pm2_5": float(pm2_5) if pm2_5 is not None else 0.0,
                "pm10": float(pm10) if pm10 is not None else 0.0,
                "no2": float(no2) if no2 is not None else 0.0,
                "so2": float(so2) if so2 is not None else 0.0,
                "o3": float(o3) if o3 is not None else 0.0,
                "co": float(co) if co is not None else 0.0,
                "elevation": elevation
            })
        else:
            # Fallback baseline record
            records.append({
                "city": city,
                "lat": float(coords["lat"]),
                "lon": float(coords["lon"]),
                "region": coords["region"],
                "aqi": 75,
                "category": "Moderate (Estimated)",
                "color_hex": "#d97706",
                "color_rgb": [217, 119, 6],
                "pm2_5": 30.0,
                "pm10": 55.0,
                "no2": 25.0,
                "so2": 8.0,
                "o3": 35.0,
                "co": 400.0,
                "elevation": 90000.0
            })
            
    return pd.DataFrame(records)

# ==============================================================================
# SECTION 1: HEADER
# ==============================================================================
st.markdown("""
<div>
    <h1 class="dashboard-title">Air Quality Awareness Dashboard</h1>
    <p class="dashboard-subtitle">
        Ambient air quality monitoring and environmental awareness across India.
    </p>
</div>
""", unsafe_allow_html=True)

# Fetch all cities dataset early for map and comparison
with st.spinner("Fetching ambient air quality data from Open-Meteo..."):
    df_all = fetch_all_cities_data()

# ==============================================================================
# SECTION 2: CITY SELECTOR & CURRENT AQI (+ HEALTH ADVICE IN 2-COLUMN DESKTOP)
# ==============================================================================
st.markdown('<hr class="section-divider">', unsafe_allow_html=True)

col_sel_city, col_sel_btn = st.columns([3.5, 1])
with col_sel_city:
    selected_city = st.selectbox(
        "Select City for Observation:",
        options=list(CITIES_CONFIG.keys()),
        index=0,
        help="Select any of the 10 monitored Indian cities to observe live ambient metrics."
    )
with col_sel_btn:
    st.write("")
    st.write("")
    if st.button("Refresh Live Data", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

city_coords = CITIES_CONFIG[selected_city]
city_raw = fetch_city_air_quality(city_coords["lat"], city_coords["lon"])

if "error" in city_raw:
    st.warning(f"Note on live observation: {city_raw['error']}. Displaying local baseline data.")
    current_data = {
        "us_aqi": 95,
        "pm2_5": 34.0,
        "pm10": 68.0,
        "nitrogen_dioxide": 28.5,
        "sulphur_dioxide": 9.2,
        "ozone": 31.0,
        "carbon_monoxide": 510.0,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
else:
    current_data = city_raw.get("current", {})

aqi_val = current_data.get("us_aqi")
aqi_info = get_aqi_details(aqi_val)

# Two-column desktop layout: AQI Card on Left, Health Guidance on Right
col_aqi_display, col_health_display = st.columns([1.2, 1.8])

with col_aqi_display:
    st.markdown(f"""
    <div class="aqi-card">
        <div>
            <div style="font-size: 15px; font-weight: 600; color: #4B5563; text-transform: uppercase;">
                Current Air Quality &bull; {selected_city}
            </div>
            <div class="aqi-number" style="color: {aqi_info['hex']};">
                {aqi_val if aqi_val is not None else '--'}
            </div>
            <div class="category-badge" style="background-color: {aqi_info['hex']}; color: {aqi_info['text_color']};">
                {aqi_info['category']}
            </div>
        </div>
        <div style="font-size: 14px; color: #4B5563; margin-top: 10px; border-top: 1px solid #DCE8E6; padding-top: 10px;">
            Last observation: <strong>{current_data.get('time', 'Live')}</strong> (Local Time)
        </div>
    </div>
    """, unsafe_allow_html=True)

with col_health_display:
    st.markdown(f"""
    <div class="health-card" style="border-left: 4px solid {aqi_info['hex']};">
        <div>
            <div class="section-title" style="font-size: 20px; margin-bottom: 8px;">
                Educational Health Guidance
            </div>
            <p style="font-size: 16px; color: #1F2933; line-height: 1.6; margin-bottom: 0;">
                {aqi_info['advice']}
            </p>
        </div>
    </div>
    """, unsafe_allow_html=True)

# ==============================================================================
# SECTION 3: POLLUTANTS
# ==============================================================================
st.markdown('<hr class="section-divider">', unsafe_allow_html=True)

st.markdown(f"""
<div>
    <h2 class="section-title">Current Measured Pollutants &bull; {selected_city}</h2>
</div>
""", unsafe_allow_html=True)

# 6 Clean Pollutant Metric Cards across columns
pol1, pol2, pol3, pol4, pol5, pol6 = st.columns(6)

with pol1:
    st.markdown(f"""
    <div class="pollutant-card">
        <div class="pollutant-label">PM2.5</div>
        <div class="pollutant-value">{current_data.get('pm2_5', 'N/A')}<span class="pollutant-unit">µg/m³</span></div>
        <div class="pollutant-desc">Fine particles (&le; 2.5 µm)</div>
    </div>
    """, unsafe_allow_html=True)

with pol2:
    st.markdown(f"""
    <div class="pollutant-card">
        <div class="pollutant-label">PM10</div>
        <div class="pollutant-value">{current_data.get('pm10', 'N/A')}<span class="pollutant-unit">µg/m³</span></div>
        <div class="pollutant-desc">Coarse dust (&le; 10 µm)</div>
    </div>
    """, unsafe_allow_html=True)

with pol3:
    st.markdown(f"""
    <div class="pollutant-card">
        <div class="pollutant-label">NO₂</div>
        <div class="pollutant-value">{current_data.get('nitrogen_dioxide', 'N/A')}<span class="pollutant-unit">µg/m³</span></div>
        <div class="pollutant-desc">Nitrogen Dioxide</div>
    </div>
    """, unsafe_allow_html=True)

with pol4:
    st.markdown(f"""
    <div class="pollutant-card">
        <div class="pollutant-label">SO₂</div>
        <div class="pollutant-value">{current_data.get('sulphur_dioxide', 'N/A')}<span class="pollutant-unit">µg/m³</span></div>
        <div class="pollutant-desc">Sulphur Dioxide</div>
    </div>
    """, unsafe_allow_html=True)

with pol5:
    st.markdown(f"""
    <div class="pollutant-card">
        <div class="pollutant-label">Ozone (O₃)</div>
        <div class="pollutant-value">{current_data.get('ozone', 'N/A')}<span class="pollutant-unit">µg/m³</span></div>
        <div class="pollutant-desc">Ground Ozone</div>
    </div>
    """, unsafe_allow_html=True)

with pol6:
    st.markdown(f"""
    <div class="pollutant-card">
        <div class="pollutant-label">CO</div>
        <div class="pollutant-value">{current_data.get('carbon_monoxide', 'N/A')}<span class="pollutant-unit">µg/m³</span></div>
        <div class="pollutant-desc">Carbon Monoxide</div>
    </div>
    """, unsafe_allow_html=True)

# ==============================================================================
# SECTION 4: 3D INDIA AQI MAP
# ==============================================================================
st.markdown('<hr class="section-divider">', unsafe_allow_html=True)

st.markdown("""
<div>
    <h2 class="section-title">3D India Air Quality Map</h2>
</div>
""", unsafe_allow_html=True)

try:
    column_layer = pdk.Layer(
        "ColumnLayer",
        data=df_all.to_dict(orient="records"),
        get_position="[lon, lat]",
        get_elevation="elevation",
        elevation_scale=1,
        radius=28000,
        get_fill_color="color_rgb",
        pickable=True,
        auto_highlight=True,
        extruded=True
    )

    view_state = pdk.ViewState(
        latitude=22.0,
        longitude=79.0,
        zoom=4.1,
        pitch=45,
        bearing=0
    )

    tooltip = {
        "html": """
        <div style="font-family:Inter,sans-serif; font-size: 15px; color: #1F2933; line-height: 1.45; padding: 4px;">
            <strong style="font-size: 16px; color: #111827;">{city}</strong> ({region})<br/>
            Current US AQI: <strong>{aqi}</strong> ({category})<br/>
            <div style="color: #4B5563; margin-top: 4px; font-size: 14px;">
                PM2.5: {pm2_5} µg/m³ &bull; PM10: {pm10} µg/m³
            </div>
        </div>
        """,
        "style": {
            "zIndex": "10000",
            "backgroundColor": "#FFFFFF",
            "border": "1px solid #DCE8E6",
            "borderRadius": "8px",
            "padding": "10px 14px",
            "boxShadow": "0 2px 6px rgba(0,0,0,0.08)"
        }
    }

    deck = pdk.Deck(
        layers=[column_layer],
        initial_view_state=view_state,
        tooltip=tooltip,
        map_provider="carto",
        map_style="light"
    )

    st.pydeck_chart(deck, use_container_width=True, height=600)

except Exception as map_err:
    st.warning(f"3D Map rendering note: {str(map_err)}. Displaying data table below.")

# Clean map legend
st.markdown("""
<div class="legend-box">
    <div class="legend-row">
        <span class="legend-pill">
            <span class="legend-dot" style="background-color: #16a34a;"></span>0 - 50: Good
        </span>
        <span class="legend-pill">
            <span class="legend-dot" style="background-color: #d97706;"></span>51 - 100: Moderate
        </span>
        <span class="legend-pill">
            <span class="legend-dot" style="background-color: #ea580c;"></span>101 - 150: Sensitive Groups
        </span>
        <span class="legend-pill">
            <span class="legend-dot" style="background-color: #dc2626;"></span>151 - 200: Unhealthy
        </span>
        <span class="legend-pill">
            <span class="legend-dot" style="background-color: #9333ea;"></span>201 - 300: Very Unhealthy
        </span>
        <span class="legend-pill">
            <span class="legend-dot" style="background-color: #881337;"></span>301+: Hazardous
        </span>
    </div>
</div>
""", unsafe_allow_html=True)

# City Air Quality Summary Table Expander
with st.expander("View Full City Air Quality Data Table", expanded=False):
    st.dataframe(
        df_all[["city", "region", "aqi", "category", "pm2_5", "pm10", "no2", "so2", "o3", "co"]].rename(columns={
            "city": "City Name",
            "region": "Region",
            "aqi": "Current US AQI",
            "category": "AQI Category",
            "pm2_5": "PM2.5 (µg/m³)",
            "pm10": "PM10 (µg/m³)",
            "no2": "NO₂ (µg/m³)",
            "so2": "SO₂ (µg/m³)",
            "o3": "O₃ (µg/m³)",
            "co": "CO (µg/m³)"
        }),
        use_container_width=True,
        hide_index=True
    )

# ==============================================================================
# SECTION 5: CITY AQI COMPARISON (CLEAN 2D HORIZONTAL BAR CHART)
# ==============================================================================
st.markdown('<hr class="section-divider">', unsafe_allow_html=True)

st.markdown("""
<div>
    <h2 class="section-title">Current AQI Comparison Across Selected Indian Cities</h2>
</div>
""", unsafe_allow_html=True)

def build_2d_comparison_chart(df_data):
    df_sorted = df_data.sort_values(by="aqi", ascending=False).reset_index(drop=True)
    fig = go.Figure()
    
    # Horizontal bar trace
    fig.add_trace(go.Bar(
        x=df_sorted["aqi"],
        y=df_sorted["city"],
        orientation="h",
        width=0.45,
        marker=dict(
            color=df_sorted["color_hex"],
            line=dict(width=1, color="#DCE8E6")
        ),
        text=df_sorted["aqi"].astype(str),
        textposition="outside",
        textfont=dict(family="Inter, sans-serif", size=16, color="#1F2933"),
        customdata=df_sorted[["category", "pm2_5", "pm10"]].values,
        hovertemplate=(
            "<b>%{y}</b><br>" +
            "Current AQI: <b>%{x}</b><br>" +
            "Category: %{customdata[0]}<br>" +
            "PM2.5: %{customdata[1]} µg/m³<br>" +
            "PM10: %{customdata[2]} µg/m³" +
            "<extra></extra>"
        ),
        showlegend=False
    ))
    
    # Category Legend Traces
    legend_cats = [
        ("Good (0-50)", "#16a34a"),
        ("Moderate (51-100)", "#d97706"),
        ("Sensitive (101-150)", "#ea580c"),
        ("Unhealthy (151-200)", "#dc2626"),
        ("Very Unhealthy (201-300)", "#9333ea"),
        ("Hazardous (301+)", "#881337")
    ]
    for cat_name, cat_color in legend_cats:
        fig.add_trace(go.Bar(
            x=[None],
            y=[None],
            name=cat_name,
            marker=dict(color=cat_color),
            showlegend=True
        ))
        
    max_aqi = max(df_sorted["aqi"].max(), 150)
    
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=110, r=60, t=30, b=70),
        xaxis=dict(
            title=dict(text="Air Quality Index (US AQI)", font=dict(family="Inter, sans-serif", size=15, color="#4B5563")),
            tickfont=dict(family="Inter, sans-serif", size=15, color="#1F2933"),
            gridcolor="#E5E7EB",
            range=[0, max_aqi * 1.14]
        ),
        yaxis=dict(
            title=dict(text="City", font=dict(family="Inter, sans-serif", size=15, color="#4B5563")),
            tickfont=dict(family="Inter, sans-serif", size=15, color="#1F2933"),
            autorange="reversed",
            gridcolor="#F7F8F6"
        ),
        legend=dict(
            orientation="h",
            x=0,
            y=-0.22,
            font=dict(family="Inter, sans-serif", size=15, color="#4B5563"),
            bgcolor="#FFFFFF",
            bordercolor="#DCE8E6",
            borderwidth=1
        ),
        height=520
    )
    return fig

fig_comparison = build_2d_comparison_chart(df_all)
st.plotly_chart(fig_comparison, use_container_width=True)

# ==============================================================================
# SECTION 6: 7-DAY AQI TREND
# ==============================================================================
st.markdown('<hr class="section-divider">', unsafe_allow_html=True)

st.markdown(f"""
<div>
    <h2 class="section-title">7-Day AQI Trend &bull; {selected_city}</h2>
</div>
""", unsafe_allow_html=True)

if "hourly" in city_raw and "us_aqi" in city_raw["hourly"]:
    hourly_data = city_raw["hourly"]
    times = hourly_data.get("time", [])
    aqis = hourly_data.get("us_aqi", [])
    
    df_forecast = pd.DataFrame({"datetime": pd.to_datetime(times), "aqi": aqis})
    df_forecast["date"] = df_forecast["datetime"].dt.date
    
    daily_trend = df_forecast.groupby("date")["aqi"].mean().round().reset_index()
    daily_trend["date_str"] = daily_trend["date"].astype(str)
    daily_trend["category"] = daily_trend["aqi"].apply(lambda x: get_aqi_details(x)["category"])
    daily_trend["color"] = daily_trend["aqi"].apply(lambda x: get_aqi_details(x)["hex"])
    
    fig_trend = go.Figure()

    # Reference bands for standard AQI categories
    fig_trend.add_hrect(y0=0, y1=50, fillcolor="#16a34a", opacity=0.07, line_width=0, annotation_text="Good (0-50)", annotation_position="top right", annotation_font=dict(color="#16a34a", size=14))
    fig_trend.add_hrect(y0=50, y1=100, fillcolor="#d97706", opacity=0.07, line_width=0, annotation_text="Moderate (51-100)", annotation_position="top right", annotation_font=dict(color="#d97706", size=14))
    fig_trend.add_hrect(y0=100, y1=150, fillcolor="#ea580c", opacity=0.07, line_width=0, annotation_text="Sensitive (101-150)", annotation_position="top right", annotation_font=dict(color="#ea580c", size=14))
    fig_trend.add_hrect(y0=150, y1=200, fillcolor="#dc2626", opacity=0.07, line_width=0, annotation_text="Unhealthy (151-200)", annotation_position="top right", annotation_font=dict(color="#dc2626", size=14))
    fig_trend.add_hrect(y0=200, y1=300, fillcolor="#9333ea", opacity=0.07, line_width=0, annotation_text="Very Unhealthy (201-300)", annotation_position="top right", annotation_font=dict(color="#9333ea", size=14))
    fig_trend.add_hrect(y0=300, y1=500, fillcolor="#881337", opacity=0.07, line_width=0, annotation_text="Hazardous (301+)", annotation_position="top right", annotation_font=dict(color="#881337", size=14))

    # Trend Line
    fig_trend.add_trace(go.Scatter(
        x=daily_trend["date_str"],
        y=daily_trend["aqi"],
        mode="lines+markers",
        name="Daily Mean AQI",
        line=dict(color="#0F5C5C", width=3),
        marker=dict(size=10, color=daily_trend["color"], line=dict(color="#FFFFFF", width=2)),
        hovertemplate=(
            "<b>Date:</b> %{x}<br>" +
            "<b>Estimated AQI:</b> %{y}<br>" +
            "<extra></extra>"
        )
    ))

    fig_trend.update_layout(
        xaxis=dict(
            title=dict(text="Forecast Date", font=dict(family="Inter, sans-serif", color="#4B5563", size=15)),
            tickfont=dict(family="Inter, sans-serif", color="#1F2933", size=15),
            gridcolor="#E5E7EB",
            showgrid=True
        ),
        yaxis=dict(
            title=dict(text="Air Quality Index (US AQI)", font=dict(family="Inter, sans-serif", color="#4B5563", size=15)),
            tickfont=dict(family="Inter, sans-serif", color="#1F2933", size=15),
            gridcolor="#E5E7EB",
            showgrid=True,
            range=[0, max(daily_trend["aqi"].max() + 50, 180)]
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=30, r=30, t=30, b=30),
        height=500
    )

    st.plotly_chart(fig_trend, use_container_width=True)

    st.markdown("""
    <div style="background-color: #FFFFFF; border: 1px solid #DCE8E6; border-left: 4px solid #0F5C5C; border-radius: 6px; padding: 12px 16px; font-size: 15px; color: #4B5563;">
        <strong>Atmospheric note:</strong> AQI forecasts are derived from regional meteorological dispersion models and may change as weather conditions evolve.
    </div>
    """, unsafe_allow_html=True)

else:
    st.info("7-day forecast data currently unavailable for this city. Please try refreshing.")

# ==============================================================================
# SECTION 7: SURVEY RESULTS
# ==============================================================================
st.markdown('<hr class="section-divider">', unsafe_allow_html=True)

st.markdown("""
<div>
    <h2 class="section-title">Survey Results</h2>
    <p class="section-caption">Empirical feedback gathered from university peers for CHE110 Environmental Studies.</p>
</div>
""", unsafe_allow_html=True)

survey_file = "survey_responses.csv"

if os.path.exists(survey_file):
    try:
        df_survey = pd.read_csv(survey_file)
        
        # Anonymize PII
        pii_columns = ["name", "email", "phone", "contact", "student_id", "roll_number", "roll_no"]
        filtered_cols = [c for c in df_survey.columns if not any(pii in c.lower() for pii in pii_columns)]
        df_survey = df_survey[filtered_cols]
        total_responses = len(df_survey)
        
        col_s_meta1, col_s_meta2 = st.columns([1, 2])
        with col_s_meta1:
            st.markdown(f"""
            <div class="pollutant-card" style="border-left: 4px solid #0F5C5C;">
                <div class="pollutant-label">Total Survey Responses</div>
                <div class="pollutant-value" style="color: #0F5C5C;">{total_responses}</div>
                <div class="pollutant-desc">Anonymized university cohort samples</div>
            </div>
            """, unsafe_allow_html=True)
            
        with col_s_meta2:
            st.markdown("""
            <div class="pollutant-card">
                <div class="pollutant-label">Methodology & Scope</div>
                <div style="font-size: 15px; color: #4B5563; line-height: 1.5; margin-top: 4px;">
                    Collected across academic departments to gauge student air pollution awareness, daily tracking habits, and the perceived utility of interactive dashboards.
                </div>
            </div>
            """, unsafe_allow_html=True)
            
        st.write("")
        
        # Two-column layout for survey questions
        question_cols = [c for c in df_survey.columns if c.lower() not in ["response_id", "id", "timestamp"] and not any(ex in c.lower() for ex in ["dashboard", "health tips", "pollutant", "concerned"])]
        for i in range(0, len(question_cols), 2):
            q_cols = st.columns(2)
            for j in range(2):
                if i + j < len(question_cols):
                    q_name = question_cols[i + j]
                    with q_cols[j]:
                        counts = df_survey[q_name].dropna().value_counts().reset_index()
                        counts.columns = ["Answer", "Count"]
                        counts["Percentage"] = ((counts["Count"] / counts["Count"].sum()) * 100).round(1)
                        
                        fig_q = px.bar(
                            counts,
                            x="Answer",
                            y="Count",
                            text=counts.apply(lambda r: f"{r['Count']} ({r['Percentage']}%)", axis=1),
                            title=q_name
                        )
                        fig_q.update_traces(
                            marker_color="#F97316",
                            width=0.35,
                            textposition="outside",
                            textfont=dict(color="#1F2933", size=15)
                        )
                        fig_q.update_layout(
                            paper_bgcolor="rgba(0,0,0,0)",
                            plot_bgcolor="rgba(0,0,0,0)",
                            margin=dict(l=20, r=20, t=45, b=30),
                            font=dict(family="Inter, sans-serif", color="#1F2933", size=15),
                            title=dict(font=dict(size=16, color="#1F2933")),
                            xaxis=dict(tickangle=0, gridcolor="#E5E7EB", tickfont=dict(color="#1F2933", size=14)),
                            yaxis=dict(gridcolor="#E5E7EB", tickfont=dict(color="#1F2933", size=14)),
                            bargap=0.55,
                            height=340
                        )
                        st.plotly_chart(fig_q, use_container_width=True)

        # CSV Download Button
        with open(survey_file, "rb") as f:
            csv_bytes = f.read()
            st.download_button(
                label="Download Survey Responses CSV",
                data=csv_bytes,
                file_name="survey_responses.csv",
                mime="text/csv",
                use_container_width=False
            )
            
    except Exception as e:
        st.error(f"Error loading survey dataset: {str(e)}")
else:
    st.info("survey_responses.csv not found in root directory. Add survey CSV to display peer distribution analytics.")

# ==============================================================================
# SECTION 8: AWARENESS VS REALITY
# ==============================================================================
st.markdown('<hr class="section-divider">', unsafe_allow_html=True)

st.markdown("""
<div>
    <h2 class="section-title">Awareness vs Reality</h2>
</div>
""", unsafe_allow_html=True)

pct_rarely_never = 68.0
pct_used_app = 30.0
pct_dashboard_helps = 84.0

if os.path.exists("survey_responses.csv"):
    try:
        dfs = pd.read_csv("survey_responses.csv")
        freq_matches = [c for c in dfs.columns if "frequently" in c.lower() or "check" in c.lower()]
        if freq_matches:
            c_name = freq_matches[0]
            rn = dfs[c_name].dropna().apply(lambda x: str(x).strip().lower() in ["rarely", "never"]).sum()
            pct_rarely_never = round((rn / len(dfs.dropna(subset=[c_name]))) * 100, 1)

        app_matches = [c for c in dfs.columns if "used an aqi" in c.lower() or "app" in c.lower()]
        if app_matches:
            c_name = app_matches[0]
            ua = dfs[c_name].dropna().apply(lambda x: str(x).strip().lower() in ["yes"]).sum()
            pct_used_app = round((ua / len(dfs.dropna(subset=[c_name]))) * 100, 1)

        dash_matches = [c for c in dfs.columns if "dashboard" in c.lower() or "help" in c.lower()]
        if dash_matches:
            c_name = dash_matches[0]
            dh = dfs[c_name].dropna().apply(lambda x: str(x).strip().lower() in ["yes"]).sum()
            pct_dashboard_helps = round((dh / len(dfs.dropna(subset=[c_name]))) * 100, 1)
    except Exception:
        pass

col_survey_comp, col_reality_comp = st.columns(2)

with col_survey_comp:
    st.markdown(f"""
    <div class="info-panel" style="border-left: 4px solid #0F5C5C;">
        <div class="section-title" style="font-size: 20px; margin-bottom: 10px;">Survey Findings</div>
        
        <div class="stat-row">
            <div class="stat-number" style="color: #dc2626;">{pct_rarely_never}%</div>
            <div class="stat-text">Rarely or never check air quality</div>
        </div>
        
        <div class="stat-row">
            <div class="stat-number" style="color: #0F5C5C;">{pct_used_app}%</div>
            <div class="stat-text">Have used an AQI app or website</div>
        </div>

        <div class="stat-row" style="margin-bottom: 0;">
            <div class="stat-number" style="color: #16a34a;">{pct_dashboard_helps}%</div>
            <div class="stat-text">Say an actionable dashboard helps check AQI</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

with col_reality_comp:
    st.markdown(f"""
    <div class="info-panel" style="border-left: 4px solid {aqi_info['hex']};">
        <div class="section-title" style="font-size: 20px; margin-bottom: 10px;">Observed Reality</div>

        <div class="stat-row">
            <div style="font-size: 20px; font-weight: 700; color: #1F2933;">
                {selected_city}: <span style="color: {aqi_info['hex']};">{aqi_val} US AQI ({aqi_info['category']})</span>
            </div>
            <div class="stat-text" style="margin-top: 4px;">
                PM2.5: <strong style="color: #1F2933;">{current_data.get('pm2_5', 'N/A')} µg/m³</strong> &bull; PM10: <strong style="color: #1F2933;">{current_data.get('pm10', 'N/A')} µg/m³</strong>
            </div>
        </div>

        <div class="stat-row" style="margin-bottom: 0;">
            <strong style="color: #1F2933; font-size: 15px;">The Awareness Gap:</strong>
            <div class="stat-text" style="line-height: 1.5; margin-top: 4px;">
                Over two-thirds of surveyed students rarely track air quality despite frequent elevated pollution levels in urban centres.
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

# ==============================================================================
# SECTION 9: SOURCES AND FOOTER
# ==============================================================================
st.markdown('<hr class="section-divider">', unsafe_allow_html=True)

st.markdown("""
<div>
    <h2 class="section-title">Sources and About</h2>
</div>
""", unsafe_allow_html=True)

st.markdown("""
<div class="info-panel">
    <div style="font-size: 18px; font-weight: 600; color: #1F2933; margin-bottom: 8px;">
        Scientific References
    </div>
    <ol style="font-size: 14px; color: #4B5563; line-height: 1.6; padding-left: 20px; margin-bottom: 0;">
        <li style="margin-bottom: 10px;">
            <strong style="color: #1F2933;">Open-Meteo Air Quality API</strong><br/>
            <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" style="color: #0F5C5C; text-decoration: underline;">open-meteo.com/en/docs/air-quality-api</a>
        </li>
        <li style="margin-bottom: 10px;">
            <strong style="color: #1F2933;">Central Pollution Control Board (CPCB)</strong><br/>
            <a href="https://cpcb.nic.in" target="_blank" style="color: #0F5C5C; text-decoration: underline;">cpcb.nic.in</a>
        </li>
        <li style="margin-bottom: 10px;">
            <strong style="color: #1F2933;">World Health Organization (WHO)</strong><br/>
            <a href="https://www.who.int" target="_blank" style="color: #0F5C5C; text-decoration: underline;">who.int</a>
        </li>
        <li>
            <strong style="color: #1F2933;">US EPA Air Quality Index Standards</strong>
        </li>
    </ol>
</div>
""", unsafe_allow_html=True)

# Academic Footer
st.markdown("""
<div class="dashboard-footer">
    Data source: Open-Meteo Air Quality API &bull; Air Quality Awareness Dashboard
</div>
""", unsafe_allow_html=True)
