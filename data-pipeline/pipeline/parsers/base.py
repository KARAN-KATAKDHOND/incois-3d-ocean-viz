"""
INCOIS Data Pipeline — Abstract Base Parser

Defines the contract all ocean data parsers must implement.
Enables plugin-style extensibility for future sensor formats
(HF Radar, ADCP, satellite altimetry, etc.).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Optional


class AbstractOceanParser(ABC):
    """
    Base class for all ocean data parsers.

    Subclasses must implement:
      - detect(): Check if a file is compatible with this parser.
      - parse(): Process the raw file into optimized storage format.
      - extract_metadata(): Extract bounds, dimensions, and variable info.
    """

    @abstractmethod
    def detect(self, file_path: Path) -> bool:
        """
        Check if this parser can handle the given file.

        Args:
            file_path: Path to the raw data file.

        Returns:
            True if the parser can process this file format.
        """
        ...

    @abstractmethod
    def parse(
        self,
        file_path: Path,
        dataset_id: str,
        output_dir: Path,
        progress_callback: Optional[callable] = None,
    ) -> dict[str, Any]:
        """
        Process the raw file into an optimized storage format.

        Args:
            file_path: Path to the raw data file.
            dataset_id: Unique identifier for the output dataset.
            output_dir: Directory to write the converted output.
            progress_callback: Optional fn(progress: float) called during processing.

        Returns:
            dict with keys: dataset_id, output_path, metadata
        """
        ...

    @abstractmethod
    def extract_metadata(self, file_path: Path) -> dict[str, Any]:
        """
        Extract metadata from a raw file without full conversion.

        Returns:
            dict with keys: variables, depth_levels, time_steps,
            bounds, units, etc.
        """
        ...

    def get_coordinate_mapping(self) -> dict[str, list[str]]:
        """
        Return the mapping of canonical coordinate names to known aliases.

        Override in subclasses for format-specific aliases.
        """
        return {
            "lon": [
                "longitude", "LONGITUDE", "lon_rho", "lon_u", "lon_v",
                "nav_lon", "x", "X", "LON",
            ],
            "lat": [
                "latitude", "LATITUDE", "lat_rho", "lat_u", "lat_v",
                "nav_lat", "y", "Y", "LAT",
            ],
            "depth": [
                "depth", "DEPTH", "nav_lev", "lev", "level", "z", "Z",
                "s_rho", "sigma", "deptht", "depthw",
            ],
            "time": [
                "time", "TIME", "time_counter", "t", "T", "ocean_time",
            ],
        }
