"""
Chinchilla Scaling Estimate
Implements the Chinchilla optimal scaling law for token estimation
"""

from typing import Optional, Tuple
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from schema import InferenceConstraint, EvidenceType


def chinchilla_estimate(
    flops: Optional[float] = None,
    params: Optional[float] = None,
    params_billions: Optional[float] = None
) -> Optional[InferenceConstraint]:
    """
    Calculate token estimate using Chinchilla scaling law
    
    Chinchilla optimal: tokens = FLOPs / (6 × params)
    
    Args:
        flops: Training FLOPs
        params: Parameters (absolute number)
        params_billions: Parameters in billions
    
    Returns:
        InferenceConstraint with token range
    """
    if not flops:
        return None
    
    # Use params_billions if provided, otherwise convert params
    if params_billions:
        params_abs = params_billions * 1e9
    elif params:
        params_abs = params
    else:
        return None
    
    # Chinchilla optimal point
    tokens_optimal = flops / (6 * params_abs)
    
    # Expand band by ×3: min = /3, max = ×3
    tokens_min = tokens_optimal / 3
    tokens_max = tokens_optimal * 3
    
    return InferenceConstraint(
        method="chinchilla",
        tokens_min=tokens_min,
        tokens_max=tokens_max,
        evidence_type=EvidenceType.E2.value,
        confidence=0.7,
        notes=f"Chinchilla optimal: {tokens_optimal/1e12:.2f}T tokens"
    )


def hardware_back_calculation(
    num_chips: int,
    chip_type: str,
    training_duration_days: Optional[float] = None,
    utilization: float = 0.35
) -> Optional[InferenceConstraint]:
    """
    Back-calculate FLOPs from hardware specs
    
    Args:
        num_chips: Number of chips/GPUs
        chip_type: Chip type (H100, TPUv5, A100, etc.)
        training_duration_days: Training duration in days
        utilization: Hardware utilization (0.2-0.5 typical)
    
    Returns:
        InferenceConstraint with estimated FLOPs and tokens
    """
    # Chip throughput lookup (FLOPs per second)
    chip_throughputs = {
        "H100": 1e15,  # 1 PFLOPS
        "TPUv5": 1.76e15,  # 1.76 PFLOPS
        "A100": 3.12e14,  # 312 TFLOPS
        "GH200": 2e15,  # 2 PFLOPS
    }
    
    throughput = chip_throughputs.get(chip_type)
    if not throughput:
        return None
    
    if not training_duration_days:
        # Default to 30 days if unknown
        training_duration_days = 30
    
    # Calculate FLOPs
    seconds = training_duration_days * 24 * 3600
    flops = num_chips * throughput * seconds * utilization
    
    # Use Chinchilla with estimated params (need params for full calculation)
    # For now, return FLOPs estimate
    return InferenceConstraint(
        method="hardware_back_calc",
        tokens_min=0,  # Would need params to calculate
        tokens_max=0,
        evidence_type=EvidenceType.E2.value,
        confidence=0.6,
        notes=f"Estimated FLOPs: {flops/1e24:.2f} FLOPs from {num_chips} {chip_type}s"
    )


def param_ratio_heuristic(
    params_billions: float,
    is_moe: bool = False,
    params_active_billions: Optional[float] = None
) -> InferenceConstraint:
    """
    Parameter ratio heuristic for token estimation
    
    Typical ratios:
    - Lower bound: 5× params
    - Mid: 15× params
    - Upper: 30× params
    
    For MoE, use active parameters
    
    Args:
        params_billions: Total parameters in billions
        is_moe: Whether model uses MoE
        params_active_billions: Active parameters for MoE models
    
    Returns:
        InferenceConstraint with token range
    """
    # Use active params for MoE
    if is_moe and params_active_billions:
        effective_params = params_active_billions
    else:
        effective_params = params_billions
    
    params_abs = effective_params * 1e9
    
    tokens_min = 5 * params_abs
    tokens_mid = 15 * params_abs
    tokens_max = 30 * params_abs
    
    return InferenceConstraint(
        method="param_ratio",
        tokens_min=tokens_min,
        tokens_max=tokens_max,
        evidence_type=EvidenceType.E3.value,
        confidence=0.5,
        notes=f"Param ratio heuristic: {effective_params:.1f}B params"
    )

