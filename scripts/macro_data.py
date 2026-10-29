"""Validated monthly macro merge; no workbook writes, network calls or deployment."""
import copy,csv,json,math,pathlib,re

EXCLUDED_LEGACY={'crb_index':'Benchmark identity remains unverified; preserve only in source history.'}
SLUGS={
 'NSW_Household_Total_SA_AUDm':'nsw_household_total',
 'NSW_Household_Discretionary_SA_AUDm':'nsw_household_discretionary',
 'NSW_Household_Transport_SA_AUDm':'nsw_household_transport',
 'NSW_Household_Hospitality_SA_AUDm':'nsw_household_hospitality',
 'NSW_Household_Total_YoY_pct':'nsw_household_yoy',
 'NSW_Retail_Total_SA_AUDm':'nsw_retail_total','NSW_Retail_MoM_pct':'nsw_retail_mom','NSW_Retail_YoY_pct':'nsw_retail_yoy',
 'NSW_Retail_Food_SA_AUDm':'nsw_retail_food','NSW_Retail_HouseholdGoods_SA_AUDm':'nsw_retail_household_goods',
 'NSW_Retail_Clothing_SA_AUDm':'nsw_retail_clothing','NSW_Retail_DepartmentOnline_SA_AUDm':'nsw_retail_department_online',
 'NSW_Retail_Other_SA_AUDm':'nsw_retail_other','NSW_Retail_Hospitality_SA_AUDm':'nsw_retail_hospitality',
 'ANZ_RoyMorgan_ConsumerConfidence_Index':'anz_consumer_confidence',
 'ANZ_RoyMorgan_MoM_IndexPts':'anz_consumer_confidence_mom','ANZ_RoyMorgan_YoY_IndexPts':'anz_consumer_confidence_yoy',
 'Westpac_MI_ConsumerSentiment_Index':'westpac_consumer_sentiment','ANZ_minus_Westpac_IndexPts':'anz_minus_westpac',
 'AU_GovBond_2Y_MonthlyAvg_pct':'bond_yield_2yr','AU_GovBond_3Y_MonthlyAvg_pct':'bond_yield_3yr',
 'AU_GovBond_5Y_MonthlyAvg_pct':'bond_yield_5yr','AU_GovBond_10Y_MonthlyAvg_pct':'bond_yield_10yr',
 'AU_GovBond_10Yminus2Y_bps':'bond_spread_10y_2y'}
DEPS={'ANZ_minus_Westpac_IndexPts':['ANZ_RoyMorgan_ConsumerConfidence_Index','Westpac_MI_ConsumerSentiment_Index'],
      'ANZ_RoyMorgan_MoM_IndexPts':['ANZ_RoyMorgan_ConsumerConfidence_Index'],
      'ANZ_RoyMorgan_YoY_IndexPts':['ANZ_RoyMorgan_ConsumerConfidence_Index'],
      'AU_GovBond_10Yminus2Y_bps':['AU_GovBond_2Y_MonthlyAvg_pct','AU_GovBond_10Y_MonthlyAvg_pct']}
NAMES={
 'nsw_household_total':'NSW Household Spending — Total (SA)',
 'nsw_household_discretionary':'NSW Household Spending — Discretionary (SA)',
 'nsw_household_transport':'NSW Household Spending — Transport (SA)',
 'nsw_household_hospitality':'NSW Household Spending — Hospitality (SA)',
 'nsw_household_yoy':'NSW Household Spending — Annual Growth',
 'nsw_retail_total':'NSW Experimental Retail Turnover (SA)',
 'nsw_retail_mom':'NSW Experimental Retail — Monthly Growth',
 'nsw_retail_yoy':'NSW Experimental Retail — Annual Growth',
 'nsw_retail_food':'NSW Experimental Retail — Food (SA)',
 'nsw_retail_household_goods':'NSW Experimental Retail — Household Goods (SA)',
 'nsw_retail_clothing':'NSW Experimental Retail — Clothing (SA)',
 'nsw_retail_department_online':'NSW Experimental Retail — Department Stores / Large Online (SA)',
 'nsw_retail_other':'NSW Experimental Retail — Other (SA)',
 'nsw_retail_hospitality':'NSW Experimental Retail — Hospitality (SA)',
 'anz_consumer_confidence':'ANZ–Roy Morgan Consumer Confidence (Monthly)',
 'anz_consumer_confidence_mom':'ANZ–Roy Morgan Confidence — Monthly Point Change',
 'anz_consumer_confidence_yoy':'ANZ–Roy Morgan Confidence — Annual Point Change',
 'westpac_consumer_sentiment':'Westpac–Melbourne Institute Consumer Sentiment (SA)',
 'anz_minus_westpac':'ANZ minus Westpac — Survey Index Difference',
 'bond_yield_2yr':'AU 2-Year Government Bond Yield (Monthly Average)',
 'bond_yield_3yr':'AU 3-Year Government Bond Yield (Monthly Average)',
 'bond_yield_5yr':'AU 5-Year Government Bond Yield (Monthly Average)',
 'bond_spread_10y_2y':'AU Government Yield Spread — 10Y minus 2Y'}

def read_monthly(path):
    with pathlib.Path(path).open(newline='',encoding='utf-8-sig') as f:
        reader=csv.reader(f);headers=next(reader)
        if not headers or headers[0]!='Month' or len(headers)!=len(set(headers)):raise ValueError('Invalid or duplicate CSV columns')
        if set(headers[1:])!=set(SLUGS):raise ValueError('Unexpected macro schema')
        data={}
        for row in reader:
            if len(row)!=len(headers):raise ValueError('CSV row width mismatch')
            key=row[0]
            if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])',key) or key in data:raise ValueError('Invalid/duplicate month')
            values={}
            for col,raw in zip(headers[1:],row[1:]):
                value=float(raw) if raw!='' else None
                if value is not None and not math.isfinite(value):raise ValueError('Nonfinite observation')
                values[col]=value
            data[key]=values
        if not data:raise ValueError('Empty macro data')
    return headers[1:],data

def extra_meta(meta,series):
    have=[p['date'][:7] for p in series if p['value'] is not None]
    return {'geography':meta['geography'],'sourceUrl':meta['source_url'],'sourceSeriesId':meta['series_id'],
            'basis':meta['basis'],'latestObservationMonth':max(have) if have else None,'validationStatus':'verified',
            'observationMonthKey':'YYYY-MM derived from date; never publication date'}

def merge(legacy,csv_path,metadata_path):
    columns,rows=read_monthly(csv_path);metadata=json.loads(pathlib.Path(metadata_path).read_text())
    result={k:copy.deepcopy(v) for k,v in legacy.items() if k not in EXCLUDED_LEGACY}
    excluded=dict(EXCLUDED_LEGACY)
    eligible={c for c in columns if metadata.get(c,{}).get('publication_eligible') is True
              and metadata[c].get('validation_status') in {'verified','official source checked','derived from RBA'}}
    for c in list(eligible):
        if any(dep not in eligible for dep in DEPS.get(c,[])):eligible.remove(c)
    for col in columns:
        slug=SLUGS[col]
        if col not in eligible:
            excluded[slug]='Source/definition or dependency not verified';result.pop(slug,None);continue
        meta=metadata[col]
        for field in ['geography','source_url','series_id','basis','units','frequency']:
            if not meta.get(field):raise ValueError('Missing metadata '+col+' '+field)
        if meta['frequency']!='monthly' or not meta['source_url'].startswith('https://'):raise ValueError('Unverified source/frequency')
        series=[{'date':m+'-01','value':rows[m][col]} for m in sorted(rows)]
        if slug in result:
            if slug!='bond_yield_10yr':raise ValueError('Indicator ID collision '+slug)
            # Preserve published ID, metadata and effective-date display semantics.
            # Reconcile by calendar month; do not introduce a competing 10Y series.
            prior=result[slug]['series'];matched=0
            for point in prior:
                m=point['date'][:7]
                if point['value'] is not None:
                    if m not in rows or rows[m][col] is None or abs(point['value']-rows[m][col])>1e-8:
                        raise ValueError('Existing 10Y differs from authority for '+m)
                    matched+=1
            if matched<36:raise ValueError('Insufficient 10Y reconciliation')
            result[slug].update(extra_meta(meta,prior))
            result[slug]['dateSemantics']='Legacy effective dates retained for compatibility; yields are monthly observations, not cash-rate decision-day yields.'
            continue
        unit='AUD million' if col.endswith('_AUDm') else '%' if col.endswith('_pct') else 'basis points' if col.endswith('_bps') else 'index points'
        source='RBA F2.1' if col.startswith('AU_GovBond') else 'ABS Monthly Household Spending Indicator (experimental retail)' if col.startswith('NSW_Retail') else 'ABS Monthly Household Spending Indicator' if col.startswith('NSW_') else 'Westpac–Melbourne Institute via RBA H3' if col.startswith('Westpac') else 'ANZ–Roy Morgan monthly history' if col.startswith('ANZ_RoyMorgan') else 'Calculated from ANZ–Roy Morgan and RBA H3'
        result[slug]={'slug':slug,'name':NAMES[slug],
            'unit':unit,'freq':'monthly','section':'context','group':'context','source':source,
            'format':'percent_direct' if unit=='%' else 'decimal_2','description':meta.get('definition',meta['basis']),
            'contextSeries':[],'contextNarrative':'','series':series,**extra_meta(meta,series)}
    for slug,ind in result.items():
        ind.setdefault('geography','Central Coast' if ind['group']=='local' else 'New South Wales' if slug=='business_confidence_nsw' else 'United States' if slug=='us_fed_rate' else 'Global' if slug in ['oil_price','iron_ore'] else 'Australia')
        ind.setdefault('basis','Existing published definition and date semantics retained')
        have=[p['date'][:7] for p in ind['series'] if p['value'] is not None]
        ind.setdefault('latestObservationMonth',max(have) if have else None)
        seen=set()
        for point in ind['series']:
            m=point['date'][:7]
            if m in seen:raise ValueError('Duplicate month in '+slug)
            seen.add(m);v=point['value']
            if v is not None and (isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v)):raise ValueError('Invalid number in '+slug)
    return result,excluded

def write_outputs(data,excluded,out):
    """Validate first, serialize completely, then replace files; never touch sources."""
    out=pathlib.Path(out);folder=out/'indicators';folder.mkdir(parents=True,exist_ok=True)
    content={folder/(slug+'.json'):json.dumps(ind,indent=2,allow_nan=False) for slug,ind in data.items()}
    content[out/'data.js']='// AUTO-GENERATED by scripts/build_data.py — do not edit manually\n// Deterministic monthly macro integration; feature-branch test output\n\nconst CC_ECONOMIC_DATA = '+json.dumps(data,indent=2,allow_nan=False)+";\n\nif (typeof module !== 'undefined') module.exports = CC_ECONOMIC_DATA;\n"
    for p,text in content.items():
        if p.exists() and p.read_text()==text:continue
        temp=p.with_suffix('.partial');temp.write_text(text);temp.replace(p)
    for slug in excluded:
        # Only named excluded generated artifacts, never arbitrary directory cleanup.
        (folder/(slug+'.json')).unlink(missing_ok=True)
