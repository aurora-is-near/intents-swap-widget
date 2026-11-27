`recorded/`: vaults.fyi borrow responses recorded through the key proxy on
2026-11-27 for the test account `0x195954FBa43C1A4266F5A66B4Fe468f459Fd0611`
(no key in them). That account has no debt: the wallet-wide list is empty,
Aave V3 Base holds 3.51 USDC supplied as collateral, Arbitrum nothing. The Base
market is trimmed to four assets.

The other files are synthetic loans with debt (one and several reserves, at
risk, repaid, another provider), in the recorded shape: protocol
`aave-collateral vault-v3`, market id the Pool address, amounts and USD values
as strings, rates and thresholds as fractions.
