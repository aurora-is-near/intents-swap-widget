INTENT = "aave_borrow"
MARKET_NAME = "Aave"
NO_REFERRAL = "0"
VARIABLE_RATE_MODE = "2"
ZERO_SLIPPAGE_ERROR = "Execution creation treats 0 bps as 100 bps (1%). Enter a positive slippage tolerance."

MARKETS = {
    "base": {
        "chain": "base",
        "chainLabel": "Base",
        "pool": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        "gateway": "0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24",
        "borrow": {
            "USDC": {
                "label": "USDC",
                "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "decimals": 6,
                "native": False,
                "assetId": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
            },
        },
        "collateral": {
            "ETH": {
                "label": "ETH",
                "address": "0x4200000000000000000000000000000000000006",
                "decimals": 18,
                "native": True,
                "assetId": "nep141:base.omft.near",
            },
            "WETH": {
                "label": "WETH",
                "address": "0x4200000000000000000000000000000000000006",
                "decimals": 18,
                "native": False,
                "assetId": "nep141:base-0x4200000000000000000000000000000000000006.omft.near",
            },
            "cbBTC": {
                "label": "cbBTC",
                "address": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
                "decimals": 8,
                "native": False,
                "assetId": "nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near",
            },
        },
    },
    "arb": {
        "chain": "arb",
        "chainLabel": "Arbitrum",
        "pool": "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        "gateway": "0x5283BEcEd7ADF6D003225C13896E536f2D4264FF",
        "borrow": {
            "USDC": {
                "label": "USDC",
                "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "decimals": 6,
                "native": False,
                "assetId": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
            },
            "USDT": {
                "label": "USDT0",
                "address": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                "decimals": 6,
                "native": False,
                "assetId": "nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near",
            },
        },
        "collateral": {
            "ETH": {
                "label": "ETH",
                "address": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                "decimals": 18,
                "native": True,
                "assetId": "nep141:arb.omft.near",
            },
            "WETH": {
                "label": "WETH",
                "address": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                "decimals": 18,
                "native": False,
                "assetId": "nep141:arb-0x82af49447d8a07e3bd95bd0d56f35241523fbab1.omft.near",
            },
        },
    },
}

def available(table):
    return ", ".join(table.keys())

def lookup(chain, collateral, borrow_asset):
    market = MARKETS.get(chain)
    if market == None:
        return {"error": "Aave V3 is not available on %s." % chain}

    borrow = market["borrow"].get(borrow_asset)
    if borrow == None:
        return {"error": "%s cannot be borrowed on %s. Choose one of: %s." % (borrow_asset, market["chainLabel"], available(market["borrow"]))}

    supplied = market["collateral"].get(collateral)
    if supplied == None:
        return {"error": "%s cannot be supplied as collateral on %s. Choose one of: %s." % (collateral, market["chainLabel"], available(market["collateral"]))}

    return {"market": market, "collateral": supplied, "borrow": borrow}

def supply_steps(market, collateral, amount, owner):
    label = collateral["label"]
    if collateral["native"]:
        # The gateway wraps what it is sent and supplies it for owner. Its
        # first argument is ignored by current gateways but still in the
        # signature.
        return [{
            "to": market["gateway"],
            "functionSignature": "depositETH(address,address,uint16)",
            "parameters": [market["pool"], owner, NO_REFERRAL],
            "value": amount,
            "metadata": {"name": "Supply " + label, "description": "Supply " + label + " to Aave V3 as collateral through the WETH gateway"},
        }]

    return [
        {
            "to": collateral["address"],
            "functionSignature": "approve(address,uint256)",
            "parameters": [market["pool"], amount],
            "value": "0",
            "metadata": {"name": "Approve " + label, "description": "Allow the Aave V3 Pool to take the " + label + " collateral"},
        },
        {
            "to": market["pool"],
            "functionSignature": "supply(address,uint256,address,uint16)",
            "parameters": [collateral["address"], amount, owner, NO_REFERRAL],
            "value": "0",
            "metadata": {"name": "Supply " + label, "description": "Supply " + label + " to Aave V3 as collateral"},
        },
    ]

def borrow_steps(market, borrow, amount, owner, recipient):
    label = borrow["label"]
    return [
        {
            "to": market["pool"],
            "functionSignature": "borrow(address,uint256,uint256,uint16,address)",
            "parameters": [borrow["address"], amount, VARIABLE_RATE_MODE, NO_REFERRAL, owner],
            "value": "0",
            "metadata": {"name": "Borrow " + label, "description": "Borrow " + label + " from Aave V3 at the variable rate against the collateral"},
        },
        {
            "to": borrow["address"],
            "functionSignature": "transfer(address,uint256)",
            "parameters": [recipient, amount],
            "value": "0",
            "metadata": {"name": "Send " + label, "description": "Send the borrowed " + label + " to the recipient"},
        },
    ]

def resolve(inputs):
    pair = lookup(inputs["chain"], inputs["collateral"], inputs["borrowAsset"])
    if "error" in pair:
        return pair

    market = pair["market"]
    collateral = pair["collateral"]
    borrow = pair["borrow"]

    bridge_in = "originAsset" in inputs
    slippage = inputs["slippageTolerance"]
    if bridge_in and slippage == 0:
        return {"error": ZERO_SLIPPAGE_ERROR}

    # Bridge-in supplies the guaranteed bridge output; steps-only supplies
    # what the intermediary already holds.
    collateral_amount = "{MIN_AMOUNT_OUT}" if bridge_in else inputs["amount"]
    title = "Borrow %s against %s on %s %s" % (borrow["label"], collateral["label"], MARKET_NAME, market["chainLabel"])

    execution = {
        "version": "1.0",
        "type": "evm",
    }
    if bridge_in:
        execution["outOperation"] = False
    else:
        execution["destinationAsset"] = collateral["assetId"]
    execution["dry"] = inputs["dry"]
    execution["metadata"] = {"intent": INTENT, "title": title}
    if bridge_in:
        execution["quote"] = {
            "originAsset": inputs["originAsset"],
            "destinationAsset": collateral["assetId"],
            "amount": inputs["amount"],
            "swapType": "EXACT_INPUT",
            "slippageTolerance": slippage,
        }
        if "deadline" in inputs:
            execution["quote"]["deadline"] = inputs["deadline"]
    execution["steps"] = supply_steps(market, collateral, collateral_amount, "{INTERMEDIARY}") + borrow_steps(market, borrow, inputs["borrowAmount"], "{INTERMEDIARY}", inputs["recipient"])
    if inputs["publicKey"]:
        execution["publicKey"] = inputs["publicKey"]
    return {"execution": execution}
