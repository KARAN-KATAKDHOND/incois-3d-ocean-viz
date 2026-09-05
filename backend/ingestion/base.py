"""
Data ingestion architecture — base classes for modular data sources.
Designed for future OPeNDAP, OGC WMS/WCS integration.
"""
from abc import ABC, abstractmethod
from typing import Any, Optional
from datetime import datetime


class DataSource(ABC):
    """Abstract base class for all data sources."""

    @abstractmethod
    def get_metadata(self) -> dict:
        """Return metadata about this data source."""
        ...

    @abstractmethod
    def get_variables(self) -> list[str]:
        """Return available variables."""
        ...

    @abstractmethod
    def get_time_range(self) -> tuple[datetime, datetime]:
        """Return temporal extent."""
        ...

    @abstractmethod
    def get_spatial_extent(self) -> dict:
        """Return spatial extent (lat_min, lat_max, lon_min, lon_max)."""
        ...


class ModelDataSource(DataSource):
    """Base class for numerical ocean model data sources."""

    @abstractmethod
    def get_volume(self, variable: str, time_index: int, resolution: int = 32) -> dict:
        """Get 3D volumetric data."""
        ...

    @abstractmethod
    def get_slice(self, variable: str, depth_index: int, time_index: int) -> dict:
        """Get 2D depth-slice data."""
        ...

    @abstractmethod
    def get_depth_levels(self) -> list[float]:
        """Return available depth levels."""
        ...

    @abstractmethod
    def get_time_steps(self) -> list[str]:
        """Return available time steps."""
        ...


class ObservationDataSource(DataSource):
    """Base class for in-situ observation data sources."""

    @abstractmethod
    def get_observations(self, **filters) -> list[dict]:
        """Get observations with optional filtering."""
        ...

    @abstractmethod
    def get_profile(self, obs_id: str, variable: str) -> dict:
        """Get depth-vs-variable profile for an observation."""
        ...


class NetCDFDataSource(ModelDataSource):
    """
    NetCDF data source using xarray.
    Integration point for real NetCDF/CF-compliant datasets.

    Future: Replace demo data with:
        ds = xarray.open_dataset("path/to/model.nc")
    """

    def __init__(self, filepath: str):
        self.filepath = filepath
        self._ds = None  # Lazy-loaded xarray Dataset

    def _open(self):
        """Lazy-load the dataset. Requires xarray and netCDF4."""
        if self._ds is None:
            try:
                import xarray as xr
                self._ds = xr.open_dataset(self.filepath)
            except ImportError:
                raise RuntimeError("xarray and netCDF4 required for NetCDF ingestion")
        return self._ds

    def get_metadata(self) -> dict:
        ds = self._open()
        return {
            "dimensions": dict(ds.dims),
            "variables": list(ds.data_vars),
            "attributes": dict(ds.attrs),
        }

    def get_variables(self) -> list[str]:
        return list(self._open().data_vars)

    def get_time_range(self):
        ds = self._open()
        if "time" in ds.coords:
            times = ds.coords["time"].values
            return (str(times[0]), str(times[-1]))
        return (None, None)

    def get_spatial_extent(self):
        ds = self._open()
        result = {}
        for name in ["lat", "latitude", "y"]:
            if name in ds.coords:
                result["lat_min"] = float(ds.coords[name].min())
                result["lat_max"] = float(ds.coords[name].max())
                break
        for name in ["lon", "longitude", "x"]:
            if name in ds.coords:
                result["lon_min"] = float(ds.coords[name].min())
                result["lon_max"] = float(ds.coords[name].max())
                break
        return result

    def get_volume(self, variable: str, time_index: int, resolution: int = 32):
        ds = self._open()
        # Future implementation: extract and resample 3D data
        raise NotImplementedError("Full NetCDF volume extraction to be implemented")

    def get_slice(self, variable: str, depth_index: int, time_index: int):
        ds = self._open()
        # Future implementation: extract 2D slice
        raise NotImplementedError("Full NetCDF slice extraction to be implemented")

    def get_depth_levels(self):
        ds = self._open()
        for name in ["depth", "z", "lev", "level"]:
            if name in ds.coords:
                return ds.coords[name].values.tolist()
        return []

    def get_time_steps(self):
        ds = self._open()
        if "time" in ds.coords:
            return [str(t) for t in ds.coords["time"].values]
        return []


class CSVDataSource(ObservationDataSource):
    """
    CSV/delimited text data source for observation data.
    """

    def __init__(self, filepath: str, delimiter: str = ","):
        self.filepath = filepath
        self.delimiter = delimiter
        self._df = None

    def _load(self):
        if self._df is None:
            import pandas as pd
            self._df = pd.read_csv(self.filepath, delimiter=self.delimiter)
        return self._df

    def get_metadata(self):
        df = self._load()
        return {
            "columns": list(df.columns),
            "row_count": len(df),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()}
        }

    def get_variables(self):
        return list(self._load().columns)

    def get_time_range(self):
        return (None, None)

    def get_spatial_extent(self):
        df = self._load()
        result = {}
        for name in ["lat", "latitude"]:
            if name in df.columns:
                result["lat_min"] = float(df[name].min())
                result["lat_max"] = float(df[name].max())
                break
        for name in ["lon", "longitude"]:
            if name in df.columns:
                result["lon_min"] = float(df[name].min())
                result["lon_max"] = float(df[name].max())
                break
        return result

    def get_observations(self, **filters):
        df = self._load()
        # Apply filters
        for key, value in filters.items():
            if key in df.columns and value is not None:
                df = df[df[key] == value]
        return df.to_dict(orient="records")

    def get_profile(self, obs_id: str, variable: str):
        df = self._load()
        # Future: extract profile from CSV data
        raise NotImplementedError("CSV profile extraction to be implemented")


class DataSourceRegistry:
    """Registry for managing multiple data sources. Plugin-style extensibility."""

    def __init__(self):
        self._sources: dict[str, DataSource] = {}

    def register(self, name: str, source: DataSource):
        """Register a new data source."""
        self._sources[name] = source

    def get(self, name: str) -> Optional[DataSource]:
        """Get a registered data source."""
        return self._sources.get(name)

    def list_sources(self) -> list[str]:
        """List all registered data source names."""
        return list(self._sources.keys())

    def unregister(self, name: str):
        """Remove a data source."""
        self._sources.pop(name, None)


# Global registry
registry = DataSourceRegistry()
