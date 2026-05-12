from __future__ import annotations

import json
import logging
from dataclasses import asdict, is_dataclass
from typing import Any

import numpy as np
from pydantic import BaseModel


logger = logging.getLogger("virtual_machining.debug")


def _summarize_array(value: np.ndarray, limit: int = 6) -> dict[str, Any]:
    array = np.asarray(value)
    flat = array.ravel()
    summary: dict[str, Any] = {
        "shape": list(array.shape),
        "dtype": str(array.dtype),
        "size": int(array.size),
    }
    if flat.size:
        finite = flat[np.isfinite(flat)] if np.issubdtype(flat.dtype, np.number) else flat
        summary["head"] = flat[:limit].tolist()
        if flat.size > limit:
            summary["tail"] = flat[-limit:].tolist()
        if np.issubdtype(flat.dtype, np.number) and finite.size:
            summary.update(
                {
                    "min": float(np.min(finite)),
                    "max": float(np.max(finite)),
                    "mean": float(np.mean(finite)),
                }
            )
    return summary


def summarize(value: Any, limit: int = 6) -> Any:
    if isinstance(value, np.ndarray):
        return _summarize_array(value, limit=limit)
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, BaseModel):
        return summarize(value.model_dump(), limit=limit)
    if is_dataclass(value):
        return summarize(asdict(value), limit=limit)
    if isinstance(value, dict):
        return {str(key): summarize(item, limit=limit) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        if len(value) > limit * 2:
            return {
                "length": len(value),
                "head": [summarize(item, limit=limit) for item in value[:limit]],
                "tail": [summarize(item, limit=limit) for item in value[-limit:]],
            }
        return [summarize(item, limit=limit) for item in value]
    return value


def debug_log(stage: str, payload: Any) -> None:
    try:
        message = json.dumps(summarize(payload), ensure_ascii=False, default=str)
    except TypeError:
        message = str(payload)
    logger.info("%s: %s", stage, message)
