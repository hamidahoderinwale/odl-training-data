"""
Priority Models List - 70 high-signal models for initial registry
This list is used programmatically by the ingestion pipeline
"""

# Tier 1: Frontier Closed Models
FRONTIER_CLOSED = {
    "OpenAI": [
        "GPT-3",
        "GPT-3.5",
        "GPT-4",
        "GPT-4 Turbo",
        "GPT-4o",
        "GPT-4.1",
        "GPT-4.1 Preview",
        "GPT-4.1 Mini",
        "o1",
        "o3",
    ],
    "Anthropic": [
        "Claude 1",
        "Claude 2",
        "Claude 2.1",
        "Claude 3 Haiku",
        "Claude 3 Sonnet",
        "Claude 3 Opus",
        "Claude 3.5 Haiku",
        "Claude 3.5 Sonnet",
        "Claude 3.5 Opus",
    ],
    "Google DeepMind": [
        "PaLM",
        "PaLM-2",
        "Gemini 1.0 Nano",
        "Gemini 1.0 Pro",
        "Gemini 1.0 Ultra",
        "Gemini 1.5 Flash",
        "Gemini 1.5 Pro",
        "Gemini 1.5 Ultra",
        "Gemini 2.0",
        "Gemini Next",
    ],
}

# Tier 1B: Major Open-Weight Models
OPEN_WEIGHT = {
    "Meta": [
        "Llama-1-7B",
        "Llama-1-13B",
        "Llama-1-30B",
        "Llama-1-65B",
        "Llama-2-7B",
        "Llama-2-13B",
        "Llama-2-70B",
        "Llama-3-8B",
        "Llama-3-70B",
        "Llama-3.1-8B",
        "Llama-3.1-70B",
        "Llama-3.1-405B",
    ],
    "Mistral AI": [
        "Mistral-7B",
        "Mixtral-8x7B",
        "Mixtral-8x22B",
        "Mistral Nemo",
        "Mistral Small",
        "Mistral Medium",
        "Mistral Large",
    ],
    "xAI": [
        "Grok-1",
        "Grok-1.5",
        "Grok-1.5 Vision",
        "Grok-2",
    ],
}

# Tier 2: Chinese Frontier Labs
CHINESE_FRONTIER = {
    "Alibaba / Qwen": [
        "Qwen-1",
        "Qwen-1.5",
        "Qwen-2-7B",
        "Qwen-2-57B",
        "Qwen-2-70B",
        "Qwen-2.5",
        "Qwen-VL",
    ],
    "DeepSeek": [
        "DeepSeek LLM",
        "DeepSeek V2",
        "DeepSeek V3",
        "DeepSeek Coder",
    ],
    "Baidu / ERNIE": [
        "ERNIE 3.0",
        "ERNIE 4.0",
        "ERNIE 4.0 Turbo",
    ],
    "SenseTime": [
        "SenseNova 5.0",
    ],
    "Other Chinese": [
        "Baichuan-2-7B",
        "Baichuan-2-13B",
        "Baichuan-3",
        "Yi-34B",
        "Yi-1.5",
    ],
}

# Tier 3: Regional Open Models
REGIONAL_OPEN = {
    "Middle East": [
        "Falcon-7B",
        "Falcon-40B",
        "Falcon-180B",
    ],
    "Korea": [
        "Exaone-2.0",
    ],
    "Japan": [
        "NICT LLM",
        "Sakana",
    ],
    "EU / UK": [
        "BLOOM-560B",
        "BLOOMZ",
        "T5-XXL",
        "OPT-175B",
        "Gopher",
        "Chinchilla",
        "U-PALM",
    ],
}

def get_all_priority_models() -> list[dict]:
    """
    Returns a flat list of all priority models with provider information
    
    Returns:
        List of dicts with 'model_id', 'provider', 'tier', 'family' keys
    """
    models = []
    
    # Tier 1: Frontier Closed
    for provider, model_list in FRONTIER_CLOSED.items():
        for model in model_list:
            models.append({
                "model_id": model,
                "provider": provider,
                "tier": "Tier 1: Frontier Closed",
                "family": _extract_family(model, provider),
            })
    
    # Tier 1B: Open Weight
    for provider, model_list in OPEN_WEIGHT.items():
        for model in model_list:
            models.append({
                "model_id": model,
                "provider": provider,
                "tier": "Tier 1B: Open Weight",
                "family": _extract_family(model, provider),
            })
    
    # Tier 2: Chinese Frontier
    for provider, model_list in CHINESE_FRONTIER.items():
        for model in model_list:
            models.append({
                "model_id": model,
                "provider": provider,
                "tier": "Tier 2: Chinese Frontier",
                "family": _extract_family(model, provider),
            })
    
    # Tier 3: Regional Open
    for provider, model_list in REGIONAL_OPEN.items():
        for model in model_list:
            models.append({
                "model_id": model,
                "provider": provider,
                "tier": "Tier 3: Regional Open",
                "family": _extract_family(model, provider),
            })
    
    return models


def _extract_family(model_id: str, provider: str) -> str:
    """Extract model family from model ID"""
    # GPT family
    if "GPT" in model_id:
        if "GPT-4" in model_id:
            return "GPT-4"
        elif "GPT-3" in model_id:
            return "GPT-3"
        return "GPT"
    
    # Claude family
    if "Claude" in model_id:
        if "3.5" in model_id:
            return "Claude 3.5"
        elif "3" in model_id:
            return "Claude 3"
        elif "2" in model_id:
            return "Claude 2"
        return "Claude"
    
    # Gemini family
    if "Gemini" in model_id:
        if "2.0" in model_id or "Next" in model_id:
            return "Gemini 2.0"
        elif "1.5" in model_id:
            return "Gemini 1.5"
        return "Gemini 1.0"
    
    # Llama family
    if "Llama" in model_id:
        if "3.1" in model_id:
            return "Llama 3.1"
        elif "3" in model_id:
            return "Llama 3"
        elif "2" in model_id:
            return "Llama 2"
        return "Llama 1"
    
    # Qwen family
    if "Qwen" in model_id:
        if "2.5" in model_id:
            return "Qwen 2.5"
        elif "2" in model_id:
            return "Qwen 2"
        elif "1.5" in model_id:
            return "Qwen 1.5"
        return "Qwen 1"
    
    # Mistral/Mixtral
    if "Mixtral" in model_id:
        return "Mixtral"
    if "Mistral" in model_id:
        return "Mistral"
    
    # Grok
    if "Grok" in model_id:
        return "Grok"
    
    # DeepSeek
    if "DeepSeek" in model_id:
        return "DeepSeek"
    
    # ERNIE
    if "ERNIE" in model_id:
        return "ERNIE"
    
    # Falcon
    if "Falcon" in model_id:
        return "Falcon"
    
    # Default: use provider as family
    return provider


def get_model_count() -> int:
    """Get total count of priority models"""
    return len(get_all_priority_models())


if __name__ == "__main__":
    models = get_all_priority_models()
    print(f"Total priority models: {len(models)}")
    print("\nBreakdown by tier:")
    from collections import Counter
    tier_counts = Counter(m["tier"] for m in models)
    for tier, count in tier_counts.items():
        print(f"  {tier}: {count}")
    print("\nBreakdown by provider:")
    provider_counts = Counter(m["provider"] for m in models)
    for provider, count in provider_counts.most_common():
        print(f"  {provider}: {count}")

