import re

with open('app.py', 'r') as f:
    content = f.read()

new_css = """<style>
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
</style>"""

content = re.sub(r'<style>.*?</style>', new_css, content, flags=re.DOTALL)

with open('app.py', 'w') as f:
    f.write(content)
