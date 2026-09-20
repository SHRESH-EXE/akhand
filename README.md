# 🌍 Air Quality Awareness Dashboard
### CHE110 Environmental Studies Project — Air Pollution Awareness using Data and Technology

An interactive, dark-themed Streamlit dashboard designed for university research and environmental education. This project demonstrates how modern computational tools, open environmental APIs, and 3D geospatial visualizations can raise public awareness about urban air pollution and empower individuals with actionable health precautions.

---

## 👥 Academic Information
- **Course Code:** CHE110 — Environmental Studies
- **Project Title:** Air Quality Awareness Dashboard
- **Department:** Department of Environmental Science & Engineering
- **Institution:** [University / Institution Name Placeholder]
- **Project Team Members:**
  - **Team Lead:** [Student Name Placeholder] (Roll No: [Roll No Placeholder])
  - **Data Engineering & API Integration:** [Team Member 2 Placeholder] (Roll No: [Roll No Placeholder])
  - **Survey Research & Analysis:** [Team Member 3 Placeholder] (Roll No: [Roll No Placeholder])
  - **Geospatial & 3D Visualization:** [Team Member 4 Placeholder] (Roll No: [Roll No Placeholder])

---

## 🌟 Key Features

1. **📍 Real-Time Ambient AQI & Pollutant Metrics:**
   - Live continuous monitoring for 10 key Indian metropolitan cities: **Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Lucknow, Chandigarh**.
   - Direct integration with the **Open-Meteo Air Quality API** (no API keys required).
   - High-contrast visual metric cards for **US AQI**, **PM2.5**, **PM10**, **NO₂**, **SO₂**, **O₃**, and **CO**.

2. **🏷️ Standardized AQI Category Badging & Health Advice:**
   - Categorization based on official EPA/NAQI standards:
     - `0 - 50`: **Good** (Green)
     - `51 - 100`: **Moderate** (Yellow)
     - `101 - 150`: **Unhealthy for Sensitive Groups** (Orange)
     - `151 - 200`: **Unhealthy** (Red)
     - `201 - 300`: **Very Unhealthy** (Purple)
     - `301+`: **Hazardous** (Dark Maroon)
   - Dynamic, student-friendly **Health & Exposure Guidance** tailored to the active AQI category.

3. **🗺️ 3D India Air Quality Map:**
   - Built with **pydeck** using a geospatial `ColumnLayer` centered over the Indian subcontinent.
   - Column heights dynamically represent current US AQI levels (taller columns = higher AQI).
   - Interactive 3D camera controls: tilt, pan, zoom, and rotate.
   - Rich hover tooltips providing city name, AQI, category, and PM concentrations.
   - Automatic tabular fallback for offline resilience.

4. **📊 3D City Comparison Chart:**
   - Multi-dimensional Plotly 3D spatial comparison across all 10 monitored cities.
   - Color-coded vertical pillars matching each city's AQI category.

5. **📈 7-Day Predictive AQI Trend:**
   - Plotly interactive time-series tracking daily forecasted AQI over the next seven days.
   - Shaded horizontal reference bands for Good, Moderate, and Unhealthy thresholds.

6. **📝 Student Survey Analysis:**
   - Auto-loads `survey_responses.csv`.
   - Generates interactive Plotly frequency and percentage distribution charts for each question.
   - Strict privacy safeguards: automatically filters out personal identifiable information (PII).

7. **⚖️ Awareness vs. Reality:**
   - Direct empirical comparison: compares students' reported habits (e.g., % rarely checking air quality) against live urban air pollution measurements.

8. **📚 "What is AQI?" Educational Module & Academic Sources:**
   - Student-friendly scientific explanations for each pollutant (PM2.5, PM10, NO2, SO2, O3, CO).
   - Formal references to Open-Meteo, Central Pollution Control Board (CPCB), and World Health Organization (WHO).

---

## 🚀 Running Locally

### Prerequisites
- Python 3.9 or higher installed on your system.

### Option A: Quick Setup using `uv` (Recommended)
```bash
# 1. Clone or download this repository
cd akhand

# 2. Create virtual environment and install dependencies
uv venv .venv
source .venv/bin/activate
uv pip install -r requirements.txt

# 3. Launch the dashboard
streamlit run app.py
```

### Option B: Standard Python `venv` & `pip`
```bash
# 1. Create virtual environment
python3 -m venv .venv

# 2. Activate virtual environment
# On Linux/macOS:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# 3. Install required packages
pip install -r requirements.txt

# 4. Run the Streamlit application
streamlit run app.py
```

The application will be accessible in your web browser at:
`http://localhost:8501`

---

## ☁️ Deploying to Streamlit Community Cloud

You can deploy this dashboard to the web for free in under 3 minutes:

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit of CHE110 Air Quality Awareness Dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Deploy on Streamlit Community Cloud:**
   - Go to [share.streamlit.io](https://share.streamlit.io/) and log in with your GitHub account.
   - Click **"New app"**.
   - Select your repository, branch (`main`), and set the **Main file path** to `app.py`.
   - Click **"Deploy!"**.
   - Your live public URL will be generated instantly and ready for university presentation.

---

## 📁 Repository Structure
```text
├── app.py                   # Main Streamlit web application
├── requirements.txt         # Project dependencies (streamlit, pandas, plotly, pydeck, requests)
├── survey_responses.csv     # Sample anonymized CHE110 student survey data
├── .streamlit/
│   └── config.toml          # Dark theme and server UI configuration
└── README.md                # Comprehensive documentation and deployment guide
```

---

## 📖 Scientific References & Data Sources
1. **Open-Meteo Air Quality API:** [https://open-meteo.com/en/docs/air-quality-api](https://open-meteo.com/en/docs/air-quality-api)
2. **Central Pollution Control Board (CPCB), India:** National Air Quality Index (NAQI) technical standards. [https://cpcb.nic.in](https://cpcb.nic.in)
3. **World Health Organization (WHO):** WHO Global Air Quality Guidelines (2021). [https://www.who.int](https://www.who.int)
4. **United States Environmental Protection Agency (US EPA):** Air Quality Index (AQI) Technical Assistance Document.
