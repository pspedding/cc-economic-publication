#!/usr/bin/env python3
"""
build_data.py — Extract CC Economic Publication data from spreadsheet
Reads: Cash_Rate_Economic_Data_Model_CC_LGA_updated.xlsx (from Dropbox sync)
Writes: data/indicators/*.json + data/data.js (bundled for static serving)

Run: python3 scripts/build_data.py
"""

import json
import os
import sys
from datetime import datetime
import openpyxl

XLSX_PATH = os.path.expanduser(
    "~/dropbox-sync/Cash_Rate_Economic_Data_Model_CC_LGA_updated.xlsx"
)
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "indicators")
DATA_JS  = os.path.join(os.path.dirname(__file__), "..", "data", "data.js")

# ---------------------------------------------------------------------------
# Indicator metadata: maps spreadsheet column name → indicator config
# Groups: local (CC-specific) vs context (national/global framing)
# ---------------------------------------------------------------------------
INDICATORS = {
    # ── Local: Labour & Economy ──────────────────────────────────────────────
    "unemployment": {
        "col": "MRM Unemployment Rate",
        "name": "Unemployment Rate",
        "unit": "%",
        "freq": "monthly",
        "section": "economy",
        "group": "local",
        "source": "ABS Labour Force (MRM)",
        "format": "percent_direct",  # value already in percent
        "description": "Central Coast unemployment rate (small area estimate).",
        "contextSeries": ["cash_rate", "us_fed_rate"],
        "contextNarrative": (
            "Unemployment on the Central Coast tends to track RBA monetary policy "
            "decisions with a 3–6 month lag. Rising interest rates dampen business "
            "investment and hiring; falling rates stimulate employment recovery."
        ),
    },
    "labour_participation": {
        "col": "Labour Force Participation Rate",
        "name": "Labour Force Participation Rate",
        "unit": "%",
        "freq": "monthly",
        "section": "economy",
        "group": "local",
        "source": "ABS Labour Force",
        "format": "percent_direct",
        "description": "Share of working-age population actively employed or seeking work.",
        "contextSeries": [],
        "contextNarrative": "",
    },
    "employment_pop_ratio": {
        "col": "Employment to Population Ratio",
        "name": "Employment-to-Population Ratio",
        "unit": "%",
        "freq": "monthly",
        "section": "economy",
        "group": "local",
        "source": "ABS Labour Force",
        "format": "percent_direct",
        "description": "Proportion of the working-age population who are employed.",
        "contextSeries": [],
        "contextNarrative": "",
    },
    "jobseeker": {
        "col": "Jobseeker Recipients",
        "name": "JobSeeker Recipients",
        "unit": "persons",
        "freq": "monthly",
        "section": "economy",
        "group": "local",
        "source": "DSS JobSeeker Monthly Profile",
        "format": "integer",
        "description": "Number of Central Coast residents receiving JobSeeker payments.",
        "contextSeries": ["unemployment"],
        "contextNarrative": (
            "JobSeeker recipient numbers are a leading indicator of labour market "
            "stress, often rising before the headline unemployment rate. "
            "Nationally, recipient volumes tracked sharply during COVID-19 and "
            "tapered as the RBA tightened monetary policy from May 2022."
        ),
    },
    "job_vacancies": {
        "col": "Job Vacancies",
        "name": "Job Vacancies (Internet)",
        "unit": "count",
        "freq": "monthly",
        "section": "economy",
        "group": "local",
        "source": "Jobs & Skills Australia IVI",
        "format": "decimal_1",
        "description": "Online job vacancy index — proxy for employer demand on the Coast.",
        "contextSeries": ["unemployment"],
        "contextNarrative": "",
    },
    "business_confidence_cc": {
        "col": "Business NSW - CC Business Confidence (quarterly)",
        "name": "CC Business Confidence",
        "unit": "index",
        "freq": "quarterly",
        "section": "economy",
        "group": "local",
        "source": "Business NSW Regional Survey",
        "format": "decimal_1",
        "description": "Central Coast business confidence index (quarterly).",
        "contextSeries": ["business_confidence_nsw"],
        "contextNarrative": (
            "CC business confidence is benchmarked against the NSW state average. "
            "The Coast tends to outperform NSW during periods of remote-work driven "
            "population growth but underperforms when construction activity softens."
        ),
    },
    "business_confidence_nsw": {
        "col": "Business NSW - NSW Business Confidence (quarterly)",
        "name": "NSW Business Confidence",
        "unit": "index",
        "freq": "quarterly",
        "section": "economy",
        "group": "context",
        "source": "Business NSW Regional Survey",
        "format": "decimal_1",
        "description": "NSW state-level business confidence index (context).",
        "contextSeries": [],
        "contextNarrative": "",
    },

    # ── Local: Housing ───────────────────────────────────────────────────────
    "house_price": {
        "col": "Average House Price",
        "name": "Average House Price",
        "unit": "AUD",
        "freq": "monthly",
        "section": "housing",
        "group": "local",
        "source": "REA Group",
        "format": "dollar_0",
        "description": "Average Central Coast house sale price.",
        "contextSeries": ["cash_rate", "avg_mortgage_rate"],
        "contextNarrative": (
            "House prices on the Central Coast are highly sensitive to interest rate "
            "cycles, typically with a 3–6 month lag after RBA decisions. The 2022–23 "
            "rate hiking cycle caused a significant price correction; the subsequent "
            "stabilisation reflects constrained supply against persistent demand."
        ),
    },
    "house_price_yoy": {
        "col": "House Price YoY (%)",
        "name": "House Price Growth (YoY)",
        "unit": "%",
        "freq": "monthly",
        "section": "housing",
        "group": "local",
        "source": "REA Group",
        "format": "percent_direct",
        "description": "Annual change in Central Coast average house price.",
        "contextSeries": ["cash_rate"],
        "contextNarrative": "",
    },
    "house_rent": {
        "col": "Average House Rent (P/W)",
        "name": "Average Weekly Rent",
        "unit": "AUD/week",
        "freq": "monthly",
        "section": "housing",
        "group": "local",
        "source": "REA Group",
        "format": "dollar_0",
        "description": "Average asking rent per week for houses on the Central Coast.",
        "contextSeries": ["vacancy_rate"],
        "contextNarrative": (
            "Rental affordability is a key liveability indicator for the Coast. "
            "Vacancy rates below 1% create upward pressure on rents; this has "
            "persisted since 2021 driven by sea-change migration and constrained supply."
        ),
    },
    "interested_buyers": {
        "col": "Interested House Buyers",
        "name": "Listing Views per Property",
        "unit": "views",
        "freq": "monthly",
        "section": "housing",
        "group": "local",
        "source": "REA Group",
        "format": "integer",
        "description": "Average listing visits per property — proxy for buyer demand.",
        "contextSeries": ["house_price"],
        "contextNarrative": "",
    },
    "vacancy_rate": {
        "col": "Residential Vacancy Rate",
        "name": "Residential Vacancy Rate",
        "unit": "%",
        "freq": "monthly",
        "section": "housing",
        "group": "local",
        "source": "SQM Research",
        "format": "percent_direct",
        "description": "Proportion of residential dwellings that are vacant.",
        "contextSeries": [],
        "contextNarrative": "",
    },
    "building_approvals_n": {
        "col": "Building Approvals - New Houses",
        "name": "Building Approvals (count)",
        "unit": "dwellings",
        "freq": "monthly",
        "section": "housing",
        "group": "local",
        "source": "ABS Building Approvals",
        "format": "integer",
        "description": "Number of new house building approvals in the Central Coast LGA.",
        "contextSeries": ["cash_rate"],
        "contextNarrative": (
            "Construction approvals are a forward indicator of housing supply. "
            "Higher interest rates raise borrowing costs for developers and buyers, "
            "dampening approval volumes with a typical 2–4 month lag after rate changes."
        ),
    },
    "building_approvals_v": {
        "col": "Building Approvals - New Houses ($000)",
        "name": "Building Approvals (value $000)",
        "unit": "AUD $000",
        "freq": "monthly",
        "section": "housing",
        "group": "local",
        "source": "ABS Building Approvals",
        "format": "dollar_0",
        "description": "Total value of new house building approvals (thousands AUD).",
        "contextSeries": [],
        "contextNarrative": "",
    },
    "avg_mortgage_rate": {
        "col": "Avg Mortgage Rate - Outstanding, All Inst (%)",
        "name": "Average Mortgage Rate",
        "unit": "%",
        "freq": "monthly",
        "section": "housing",
        "group": "context",
        "source": "RBA",
        "format": "percent_direct",
        "description": "National average outstanding mortgage rate across all institutions.",
        "contextSeries": ["cash_rate"],
        "contextNarrative": "",
    },
    "owner_occupier_credit": {
        "col": "Owner-Occupier Housing Credit (AUD $B)",
        "name": "Owner-Occupier Housing Credit",
        "unit": "AUD $B",
        "freq": "monthly",
        "section": "housing",
        "group": "context",
        "source": "RBA",
        "format": "decimal_2",
        "description": "National outstanding owner-occupier housing credit (context).",
        "contextSeries": ["cash_rate"],
        "contextNarrative": "",
    },
    "investor_credit": {
        "col": "Investor Housing Credit (AUD $B)",
        "name": "Investor Housing Credit",
        "unit": "AUD $B",
        "freq": "monthly",
        "section": "housing",
        "group": "context",
        "source": "RBA",
        "format": "decimal_2",
        "description": "National outstanding investor housing credit (context).",
        "contextSeries": ["cash_rate"],
        "contextNarrative": "",
    },
    "cra_recipients": {
        "col": "Common-wealth Rent Assistance Recipients",
        "name": "Commonwealth Rent Assistance Recipients",
        "unit": "persons",
        "freq": "quarterly",
        "section": "housing",
        "group": "local",
        "source": "DSS",
        "format": "integer",
        "description": "Central Coast residents receiving Commonwealth Rent Assistance.",
        "contextSeries": ["house_rent", "vacancy_rate"],
        "contextNarrative": (
            "Rising CRA recipient numbers signal growing housing affordability stress. "
            "On the Central Coast, CRA recipients increased markedly post-2021 as "
            "sea-change migration drove rents above affordability thresholds for "
            "lower-income residents."
        ),
    },

    # ── Local: Retail & Consumer ─────────────────────────────────────────────
    "retail_total": {
        "col": "Retail Spend - Total",
        "name": "Total Retail Spend",
        "unit": "index",
        "freq": "monthly",
        "section": "economy",
        "group": "local",
        "source": "CommBank IQ",
        "format": "decimal_1",
        "description": "Total retail card spend index for the Central Coast.",
        "contextSeries": ["cash_rate", "cpi_yoy"],
        "contextNarrative": (
            "Retail spend reflects consumer confidence and purchasing power. "
            "Higher interest rates reduce discretionary spending as mortgage "
            "repayments rise. Central Coast retail is bolstered by visitor spending "
            "during peak tourism seasons."
        ),
    },
    "retail_tourism": {
        "col": "Retail Spend - Tourism & Entertainment",
        "name": "Tourism & Entertainment Spend",
        "unit": "index",
        "freq": "monthly",
        "section": "tourism",
        "group": "local",
        "source": "CommBank IQ",
        "format": "decimal_1",
        "description": "Tourism and entertainment card spend index — visitor economy proxy.",
        "contextSeries": ["airbnb_revenue"],
        "contextNarrative": "",
    },
    "retail_discretionary": {
        "col": "Retail Spend - Discretionary",
        "name": "Discretionary Retail Spend",
        "unit": "index",
        "freq": "monthly",
        "section": "economy",
        "group": "local",
        "source": "CommBank IQ",
        "format": "decimal_1",
        "description": "Discretionary (non-essential) retail card spend index.",
        "contextSeries": ["cash_rate"],
        "contextNarrative": "",
    },

    # ── Local: Tourism / STRA ────────────────────────────────────────────────
    "airbnb_revenue": {
        "col": "Airbnb Gross Revenue",
        "name": "Short-Term Rental Gross Revenue",
        "unit": "AUD",
        "freq": "monthly",
        "section": "tourism",
        "group": "local",
        "source": "AllTheRooms STRA Analytics",
        "format": "dollar_0",
        "description": "Total gross revenue across all active STRA listings on the Coast.",
        "contextSeries": ["retail_tourism"],
        "contextNarrative": (
            "Short-term rental revenue is a sensitive indicator of visitor economy "
            "health. The Central Coast STRA market surged during COVID-19 domestic "
            "travel restrictions (2020–21) and has since moderated as international "
            "travel resumed. Oil price movements influence drive-market visitor volumes."
        ),
    },
    "airbnb_revpal": {
        "col": "Airbnb RevPAL",
        "name": "Short-Term Rental Revenue per Available Listing",
        "unit": "AUD",
        "freq": "monthly",
        "section": "tourism",
        "group": "local",
        "source": "AllTheRooms STRA Analytics",
        "format": "dollar_2",
        "description": "Revenue per available listing (RevPAL) — STRA efficiency metric.",
        "contextSeries": [],
        "contextNarrative": "",
    },

    # ── Local: Transport & Vehicles ──────────────────────────────────────────
    "vehicles_total": {
        "col": "Total New Vehicle Registrations",
        "name": "Total New Vehicle Registrations",
        "unit": "count",
        "freq": "monthly",
        "section": "transport",
        "group": "local",
        "source": "Transport for NSW",
        "format": "integer",
        "description": "New vehicle registrations in the Central Coast LGA.",
        "contextSeries": ["oil_price"],
        "contextNarrative": (
            "New vehicle registrations track consumer confidence and business fleet "
            "renewal cycles. Oil price movements influence the mix between conventional "
            "and electric vehicles, with a typical 1–2 month lag between a price "
            "signal and observable registration behaviour."
        ),
    },
    "vehicles_private": {
        "col": "Private Vehicles",
        "name": "Private Vehicle Registrations",
        "unit": "count",
        "freq": "monthly",
        "section": "transport",
        "group": "local",
        "source": "Transport for NSW",
        "format": "integer",
        "description": "New private vehicle registrations in the Central Coast LGA.",
        "contextSeries": ["oil_price"],
        "contextNarrative": "",
    },
    "vehicles_business": {
        "col": "Business Vehicles",
        "name": "Business Vehicle Registrations",
        "unit": "count",
        "freq": "monthly",
        "section": "transport",
        "group": "local",
        "source": "Transport for NSW",
        "format": "integer",
        "description": "New business vehicle registrations in the Central Coast LGA.",
        "contextSeries": [],
        "contextNarrative": "",
    },

    # ── Context: Monetary Policy ──────────────────────────────────────────────
    "cash_rate": {
        "col": "Cash rate target %",
        "name": "RBA Cash Rate Target",
        "unit": "%",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "RBA",
        "format": "percent_direct",
        "description": "Reserve Bank of Australia official cash rate target.",
        "contextSeries": [],
        "contextNarrative": (
            "The RBA cash rate is the primary lever of Australian monetary policy. "
            "Rate decisions flow through to mortgage rates, business lending, "
            "consumer confidence, and asset prices — all with varying lags. "
            "The 2022–23 hiking cycle (from 0.10% to 4.35%) was the most aggressive "
            "in three decades."
        ),
    },
    "cpi_yoy": {
        "col": "CPI Year over Year % Change",
        "name": "CPI Inflation (YoY)",
        "unit": "%",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "ABS Monthly CPI Indicator",
        "format": "percent_direct",
        "description": "Australian CPI annual inflation rate (monthly indicator).",
        "contextSeries": ["cash_rate"],
        "contextNarrative": (
            "Inflation peaked at 8.4% in December 2022 and has since moderated "
            "toward the RBA's 2–3% target band. Persistently elevated services "
            "inflation — driven partly by housing costs — has delayed rate cuts."
        ),
    },
    "us_fed_rate": {
        "col": "US Fed Funds Rate (%)",
        "name": "US Federal Funds Rate",
        "unit": "%",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "Federal Reserve",
        "format": "percent_direct",
        "description": "US Federal Reserve target funds rate.",
        "contextSeries": ["cash_rate"],
        "contextNarrative": (
            "The US Fed rate anchors global risk-free rates. RBA decisions are "
            "influenced by — but not mechanically linked to — Fed moves. "
            "AUD/USD and Australian bond yields are sensitive to Fed signals."
        ),
    },
    "bond_yield_10yr": {
        "col": "AU 10yr Govt Bond Yield (%)",
        "name": "AU 10-Year Bond Yield",
        "unit": "%",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "RBA",
        "format": "percent_direct",
        "description": "Australian 10-year government bond yield — long-term rate benchmark.",
        "contextSeries": ["cash_rate", "us_fed_rate"],
        "contextNarrative": "",
    },
    "rba_twi": {
        "col": "RBA Trade-Weighted Index (TWI)",
        "name": "AUD Trade-Weighted Index",
        "unit": "index",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "RBA",
        "format": "decimal_1",
        "description": "RBA trade-weighted index — overall AUD exchange rate against trading partners.",
        "contextSeries": [],
        "contextNarrative": "",
    },
    "aud_usd": {
        "col": "AUD/USD",
        "name": "AUD/USD Exchange Rate",
        "unit": "USD",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "RBA",
        "format": "decimal_4",
        "description": "Australian dollar / US dollar exchange rate.",
        "contextSeries": ["oil_price", "iron_ore"],
        "contextNarrative": (
            "The AUD is a commodity currency — closely linked to iron ore, coal, "
            "and LNG prices. A weaker AUD raises import prices (including fuel), "
            "feeds into domestic inflation, and affects the purchasing power of "
            "international tourists visiting the Central Coast."
        ),
    },

    # ── Context: Commodities ──────────────────────────────────────────────────
    "oil_price": {
        "col": "Oil Price",
        "name": "Oil Price (Brent, USD/bbl)",
        "unit": "USD/bbl",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "CRB / Market data",
        "format": "decimal_2",
        "description": "Brent crude oil price (USD per barrel).",
        "contextSeries": ["aud_usd", "vehicles_total"],
        "contextNarrative": (
            "Oil prices are the primary global driver of fuel costs, affecting "
            "both transport costs for businesses and the relative economics of "
            "EV adoption. Higher oil prices accelerate EV uptake with an observable "
            "1–2 month lag in new registration data."
        ),
    },
    "iron_ore": {
        "col": "Iron Ore Spot Price (USD/t)",
        "name": "Iron Ore Spot Price",
        "unit": "USD/t",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "Market data",
        "format": "decimal_2",
        "description": "Iron ore spot price (USD per tonne) — key Australian export commodity.",
        "contextSeries": ["aud_usd"],
        "contextNarrative": "",
    },
    "crb_index": {
        "col": "CRB Commodity Index",
        "name": "CRB Commodity Index",
        "unit": "index",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "CRB",
        "format": "decimal_1",
        "description": "Thomson Reuters / CoreCommodity CRB index — broad commodities benchmark.",
        "contextSeries": [],
        "contextNarrative": "",
    },
    "bulk_commodities": {
        "col": "RBA Bulk Commodities Index - AUD (2024/25=100)",
        "name": "RBA Bulk Commodities Index (AUD)",
        "unit": "index (2024/25=100)",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "RBA",
        "format": "decimal_1",
        "description": "RBA bulk commodities index in AUD — coal, iron ore, LNG.",
        "contextSeries": [],
        "contextNarrative": "",
    },

    # ── Context: Markets ──────────────────────────────────────────────────────
    "asx200": {
        "col": "ASX 200 (month-end close)",
        "name": "ASX 200",
        "unit": "points",
        "freq": "monthly",
        "section": "context",
        "group": "context",
        "source": "ASX",
        "format": "integer",
        "description": "ASX 200 index month-end close — Australian equities benchmark.",
        "contextSeries": ["cash_rate"],
        "contextNarrative": (
            "Equity markets reflect aggregate expectations about economic growth, "
            "corporate earnings, and monetary policy. Rising rates typically compress "
            "equity valuations; the ASX 200 is also sensitive to commodity prices "
            "given the heavy resource-sector weighting."
        ),
    },
}

# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def safe_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def fmt_date(v):
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, str):
        return v[:10]
    return str(v)

def extract():
    print(f"Loading: {XLSX_PATH}")
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True, data_only=True)
    ws = wb["Interest Rate Decisions"]
    rows = list(ws.iter_rows(values_only=True))
    headers = list(rows[0])
    data_rows = rows[1:]

    # Build col-index lookup
    col_idx = {h: i for i, h in enumerate(headers) if h is not None}

    all_indicators = {}

    for slug, cfg in INDICATORS.items():
        col_name = cfg["col"]
        if col_name not in col_idx:
            print(f"  [WARN] column not found: {col_name} → skipping {slug}")
            continue

        ci = col_idx[col_name]
        date_ci = col_idx["Effective Date"]

        series = []
        for row in data_rows:
            date_val = row[date_ci] if len(row) > date_ci else None
            data_val = row[ci] if len(row) > ci else None
            if date_val is None:
                continue
            v = safe_float(data_val)
            series.append({"date": fmt_date(date_val), "value": v})

        # Sort chronologically (oldest first)
        series.sort(key=lambda x: x["date"])

        indicator = {
            "slug": slug,
            "name": cfg["name"],
            "unit": cfg["unit"],
            "freq": cfg["freq"],
            "section": cfg["section"],
            "group": cfg["group"],
            "source": cfg["source"],
            "format": cfg["format"],
            "description": cfg["description"],
            "contextSeries": cfg["contextSeries"],
            "contextNarrative": cfg["contextNarrative"],
            "series": series,
        }

        # Write individual JSON
        out_path = os.path.join(OUT_DIR, f"{slug}.json")
        with open(out_path, "w") as f:
            json.dump(indicator, f, indent=2)
        print(f"  ✓ {slug}: {len([p for p in series if p['value'] is not None])} data points → {out_path}")

        all_indicators[slug] = indicator

    wb.close()

    # Write bundled data.js
    js_content = (
        "// AUTO-GENERATED by scripts/build_data.py — do not edit manually\n"
        "// Re-run: python3 scripts/build_data.py\n"
        f"// Built: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
        f"const CC_ECONOMIC_DATA = {json.dumps(all_indicators, indent=2)};\n\n"
        "if (typeof module !== 'undefined') module.exports = CC_ECONOMIC_DATA;\n"
    )
    with open(DATA_JS, "w") as f:
        f.write(js_content)
    print(f"\n✓ Bundled data.js → {DATA_JS}")
    print(f"  Indicators: {len(all_indicators)}")

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    extract()
    print("\nDone.")
