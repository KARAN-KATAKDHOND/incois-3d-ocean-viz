import argparse
import json
import logging
import csv
import sys
from pathlib import Path
from datetime import datetime

# Adjust Python path to load backend modules
sys.path.append(str(Path(__file__).parent.parent.resolve()))

from services.analysis.inference_engine import generate_inference
from services.analysis.correlation import compute_correlation_matrix
from services.analysis.trend_analysis import compute_trends
from services.analysis.anomaly import detect_anomalies

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("Export")

def export_csv(data: dict, filepath: Path):
    """Export trends data as CSV."""
    if not data or "trends" not in data or not data["trends"]:
        logger.warning("No trend data available for CSV export.")
        return

    times = data.get("times", [])
    trends = data["trends"]
    
    with open(filepath, "w", newline="") as f:
        writer = csv.writer(f)
        
        # Header
        headers = ["Time"] + [t["display_name"] for t in trends]
        writer.writerow(headers)
        
        # Data rows
        for i, time_val in enumerate(times):
            row = [time_val]
            for t in trends:
                if i < len(t["values"]):
                    row.append(t["values"][i])
                else:
                    row.append("")
            writer.writerow(row)
    
    logger.info(f"CSV exported successfully to {filepath}")

def generate_report(dataset_id: str, format_type: str, output_dir: str):
    """Generate and save an analysis report."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if format_type.lower() == "csv":
        logger.info(f"Generating CSV trend report for {dataset_id}...")
        trends = compute_trends(dataset_id, ["temperature", "salinity", "current_speed"], 0, 30)
        filepath = output_path / f"ocean_trends_{dataset_id}_{timestamp}.csv"
        export_csv(trends, filepath)
        
    elif format_type.lower() == "json":
        logger.info(f"Generating comprehensive JSON report for {dataset_id}...")
        
        # Gather all insights
        inference = generate_inference(dataset_id, 0, 30)
        trends = compute_trends(dataset_id, ["temperature", "salinity", "current_speed"], 0, 30)
        corr_matrix = compute_correlation_matrix(dataset_id, ["temperature", "salinity", "current_speed"], 0, 30)
        
        report_data = {
            "metadata": {
                "dataset_id": dataset_id,
                "generated_at": datetime.now().isoformat(),
                "time_range": {"start_idx": 0, "end_idx": 30}
            },
            "inferences": inference,
            "correlations": corr_matrix,
            "trends_summary": [
                {
                    "variable": t["variable"],
                    "trend": t["direction"],
                    "delta": t["delta"]
                }
                for t in (trends.get("trends", []) if trends else [])
            ]
        }
        
        filepath = output_path / f"ocean_report_{dataset_id}_{timestamp}.json"
        with open(filepath, "w") as f:
            json.dump(report_data, f, indent=2)
            
        logger.info(f"JSON report exported successfully to {filepath}")
        
    elif format_type.lower() == "pdf":
        logger.info(f"Generating PDF report for {dataset_id}...")
        try:
            from fpdf import FPDF
        except ImportError:
            logger.error("fpdf2 not installed. Run: pip install fpdf2")
            return
            
        # Gather all insights
        inference = generate_inference(dataset_id, 0, 30)
        
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, "Ocean Intelligence Report", ln=True, align='C')
        
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 10, f"Dataset: {dataset_id}", ln=True)
        pdf.cell(0, 10, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=True)
        pdf.ln(5)
        
        if inference and inference.get("primary_insight"):
            pi = inference["primary_insight"]
            pdf.set_font("Helvetica", "B", 14)
            pdf.cell(0, 10, pi["title"], ln=True)
            
            pdf.set_font("Helvetica", "", 12)
            pdf.multi_cell(0, 10, pi["observation"])
            pdf.ln(2)
            
            pdf.set_font("Helvetica", "I", 11)
            pdf.multi_cell(0, 8, pi["interpretation"])
            pdf.ln(5)
            
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 10, f"Confidence: {pi['confidence']['level'].upper()}", ln=True)
        
        filepath = output_path / f"ocean_report_{dataset_id}_{timestamp}.pdf"
        pdf.output(str(filepath))
        logger.info(f"PDF report exported successfully to {filepath}")
        
    else:
        logger.error(f"Unsupported format: {format_type}. Use 'csv', 'json', or 'pdf'.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Ocean Analysis Reports")
    parser.add_argument("--dataset", type=str, default="noaa_sst_real", help="Dataset ID")
    parser.add_argument("--format", type=str, choices=["csv", "json", "pdf"], default="json", help="Export format")
    parser.add_argument("--out", type=str, default="exports", help="Output directory")
    
    args = parser.parse_args()
    generate_report(args.dataset, args.format, args.out)
