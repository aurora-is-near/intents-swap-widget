/* eslint-disable */
/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Run `yarn generate:api` to refresh from the OpenAPI document:
 *   https://intents-connect-alpha-api.aurora.dev/swagger/openapi.json
 *
 * Not part of this package's public API. See ./conformance.ts for how these
 * types are used to detect wire-contract drift.
 */

export interface paths {
    "/api/v1/executions/deposit/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record a deposit transaction hash
         * @description Records the origin-chain deposit transaction hash and notifies 1click. For MEMO deposit-mode chains (e.g. Stellar) the memo is required: it identifies the execution together with the deposit address and is forwarded to 1click. The memo is returned in the create and list responses, and omitting it for a MEMO-mode deposit returns 404. SIMPLE-mode chains (unique deposit address) omit the memo.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Deposit transaction */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["controllers.submitDepositRequestDoc"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.statusResultResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/executions/{wallet}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List executions for a wallet */
        get: {
            parameters: {
                query?: {
                    /** @description Optional execution UUID filter. Accepts a single UUID or comma-separated UUIDs. */
                    id?: string;
                    /** @description Optional execution status filter. Accepts a single status or comma-separated statuses. */
                    status?: "CREATED" | "DEPOSIT_PENDING" | "DEPOSIT_PROCESSING" | "OPERATION_PENDING" | "OPERATION_PROCESSING" | "SUCCESS" | "DEPOSIT_FAILED" | "OPERATION_FAILED" | "EXPIRED";
                };
                header?: never;
                path: {
                    /** @description Origin wallet identifier. */
                    wallet: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.executionListResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a quote-backed execution
         * @description Creates or dry-runs a quote-backed execution. In non-dry mode the response includes the MPC intent payload that the frontend must sign. The destination type selects the step shape - EVM destinations send ExecutionStepEVM objects, Solana destinations (type=solana) send ExecutionStepSolana objects under the same steps key. The type field accepts only evm or solana and defaults to evm when omitted - any other value is rejected with 400. Bridge-in requests execute steps on the destination chain after the 1click deposit succeeds. Out-operation requests execute steps on the origin chain and transfer the resulting tokens to the 1click deposit address. Solana supports bridge-in and out-operation, plus a gasless SPL model where a relayer pays the network fee in the destination token. Step objects accept only their documented fields - a key from the other step shape, a differently cased spelling of a field, the same key twice, or any field not listed is rejected with 400. Anything else a client needs to carry belongs in the step metadata object, which the backend passes through untouched. Step payloads nested more than 15 containers deep are also rejected with 400, counting the steps array itself as the first level - the metadata object is exempt. A step functionSignature may nest tuples or arrays at most 6 levels deep and may be at most 1024 bytes. An EVM steps array may hold at most 30 steps and a Solana one at most 50. Request bodies are limited to 256 KB. For Stellar origins the response includes quote.depositMemo and the deposit transfer must include that memo or the bridge will not settle.
         */
        post: {
            parameters: {
                query?: never;
                header: {
                    /** @description API key generated at https://studio.aurora.dev */
                    "x-api-key": string;
                };
                path: {
                    /** @description Origin wallet identifier. Supports EVM addresses, NEAR accounts, NEAR implicit accounts, Solana base58 public keys, Stellar G-addresses, TON user-friendly addresses (TON requires body.publicKey), and Tron base58 (T...) addresses. */
                    wallet: string;
                };
                cookie?: never;
            };
            /** @description Execution request. For type=solana, each step is an executionStepSolanaDoc under the same steps key. */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["controllers.createExecutionRequestDoc"];
                };
            };
            responses: {
                /** @description Dry-run execution quote. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.executionObjectResponse"];
                    };
                };
                /** @description Execution created and paired transaction prepared. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.executionObjectResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Missing or invalid api token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Request body exceeds the configured size limit. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Bad Gateway */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description No Solana durable nonce account available (bridge-in / out-op). Retry shortly. */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/executions/{wallet}/intermediary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Derive intermediary addresses (EVM + Solana) */
        get: {
            parameters: {
                query?: {
                    /** @description Origin wallet ed25519 public key (ed25519:<base58>). Required for TON wallets and must be the wallet's owner key (the address must re-derive from it). Ignored otherwise. */
                    publicKey?: string;
                };
                header?: never;
                path: {
                    /** @description Origin wallet identifier. Supports EVM addresses, NEAR accounts, NEAR implicit accounts, Solana base58 public keys, Stellar G-addresses, TON user-friendly addresses, and Tron base58 (T...) addresses. */
                    wallet: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.intermediaryResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Bad Gateway */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/executions/{wallet}/steps": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a steps-only execution
         * @description Creates or dry-runs an execution without a 1click quote. The intermediary is expected to already hold the destination token. Non-dry requests include a signing payload in result.details. The destination type selects the step shape - EVM destinations send ExecutionStepEVM objects, Solana destinations (type=solana) send ExecutionStepSolana objects under the same steps key. The type field accepts only evm or solana and defaults to evm when omitted - any other value is rejected with 400. Solana steps-only supports native SOL and SPL destinations, where the SPL path uses the gasless relayer model. Step objects accept only their documented fields - a key from the other step shape, a differently cased spelling of a field, the same key twice, or any field not listed is rejected with 400. Anything else a client needs to carry belongs in the step metadata object, which the backend passes through untouched. Step payloads nested more than 15 containers deep are also rejected with 400, counting the steps array itself as the first level - the metadata object is exempt. A step functionSignature may nest tuples or arrays at most 6 levels deep and may be at most 1024 bytes. An EVM steps array may hold at most 30 steps and a Solana one at most 50. Request bodies are limited to 256 KB.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Origin wallet identifier. Supports EVM addresses, NEAR accounts, NEAR implicit accounts, Solana base58 public keys, Stellar G-addresses, TON user-friendly addresses, and Tron base58 (T...) addresses. */
                    wallet: string;
                };
                cookie?: never;
            };
            /** @description Steps-only execution request. Steps items follow the destination type - executionStepEVMDoc for EVM, executionStepSolanaDoc for Solana (shown). */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["controllers.createStepsExecutionRequestDoc"];
                };
            };
            responses: {
                /** @description Dry-run steps-only execution estimate. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.executionObjectResponse"];
                    };
                };
                /** @description Steps-only execution created and paired transaction prepared. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.executionObjectResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description An execution for this wallet is already in progress. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Request body exceeds the configured size limit. */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Bad Gateway */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description No Solana durable nonce account available (steps-only). Retry shortly. */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/executions/{wallet}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit signed intent payload
         * @description Verifies the frontend signature and stores the signed payload. If the execution is already OPERATION_PENDING, the transaction moves to SIGNING. Otherwise it remains prepared until the deposit completes.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Origin wallet identifier. */
                    wallet: string;
                };
                cookie?: never;
            };
            /** @description Signed intent payload */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["controllers.submitSignatureRequestDoc"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.statusResultResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/executions/{wallet}/{executionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete an execution
         * @description Removes an execution and its transactions. Allowed only for the wallet that owns the row, only in deletable statuses (CREATED, DEPOSIT_PENDING, OPERATION_PENDING, EXPIRED, DEPOSIT_FAILED, OPERATION_FAILED). SUCCESS rows cannot be deleted. Requires a signature over "delete_execution:<executionId>" valid for the route wallet.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description Origin wallet identifier. */
                    wallet: string;
                    /** @description Execution UUID. */
                    executionId: string;
                };
                cookie?: never;
            };
            /** @description Signed delete request */
            requestBody: {
                content: {
                    "application/json": components["schemas"]["controllers.deleteExecutionRequestDoc"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.statusResultResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/supported_tokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List supported tokens
         * @description Returns filtered input and output token lists fetched from 1click and cached by the API.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Optional flow filter. Use outOperation to swap supported input/output token lists for EVM-origin out-operation flows. */
                    flow?: "inOperation" | "outOperation";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.tokenResponse"];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
                /** @description Bad Gateway */
                502: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["controllers.errorResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        "controllers.createExecutionQuoteDoc": {
            /** @example 1000000 */
            amount?: string;
            /** @example 2026-05-20T15:30:00Z */
            deadline?: string;
            /** @example nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near */
            destinationAsset?: string;
            /** @example nep141:wrap.near */
            originAsset?: string;
            /** @example 0x0000000000000000000000000000000000000000 */
            recipient?: string;
            /** @example 100 */
            slippageTolerance?: number;
            /**
             * @example EXACT_INPUT
             * @enum {string}
             */
            swapType?: "EXACT_INPUT" | "EXACT_OUTPUT";
        };
        "controllers.createExecutionRequestDoc": {
            /**
             * @description AddressLookupTables are base58 Address Lookup Table account addresses
             *     (Solana destinations only). When set, the backend compresses matching step
             *     accounts into lookup indices and emits a v0 transaction so many-account
             *     actions fit under the packet size limit. Additive and ignored for EVM.
             */
            addressLookupTables?: string[];
            /** @example false */
            dry?: boolean;
            metadata?: {
                [key: string]: unknown;
            };
            /** @example false */
            outOperation?: boolean;
            /**
             * @description PublicKey is the origin wallet's ed25519 key (ed25519:<base58>). Required for
             *     TON (address can't yield the pubkey) and must be the wallet's owner key. Ignored otherwise.
             * @example ed25519:...
             */
            publicKey?: string;
            quote?: components["schemas"]["controllers.createExecutionQuoteDoc"];
            /**
             * @description Steps are ExecutionStepEVM objects for EVM destinations. For Solana
             *     destinations (type=solana) each step is an executionStepSolanaDoc instead,
             *     sent under this same steps key.
             */
            steps?: components["schemas"]["controllers.executionStepEVMDoc"][];
            /**
             * @description Type selects the step shape. Must be evm or solana, defaults to evm when omitted, any other value is rejected with 400.
             * @example evm
             * @enum {string}
             */
            type?: "evm" | "solana";
            /** @example 1.0 */
            version?: string;
        };
        "controllers.createStepsExecutionRequestDoc": {
            /**
             * @description AddressLookupTables are base58 Address Lookup Table account addresses for
             *     Solana destinations only (see createExecutionRequestDoc.AddressLookupTables).
             *     Additive and ignored for EVM.
             */
            addressLookupTables?: string[];
            /** @example nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near */
            destinationAsset?: string;
            /** @example false */
            dry?: boolean;
            metadata?: {
                [key: string]: unknown;
            };
            /**
             * @description PublicKey is the origin wallet's ed25519 key. Required for TON and ignored otherwise.
             * @example ed25519:...
             */
            publicKey?: string;
            /**
             * @description Steps items follow the destination type. For Solana destinations
             *     (type=solana) each step is an executionStepSolanaDoc (shown here). For EVM
             *     destinations each step is an executionStepEVMDoc, sent under this same steps
             *     key.
             */
            steps?: components["schemas"]["controllers.executionStepSolanaDoc"][];
            /**
             * @description Type selects the step shape. Must be evm or solana, defaults to evm when omitted, any other value is rejected with 400.
             * @example evm
             * @enum {string}
             */
            type?: "evm" | "solana";
            /** @example 1.0 */
            version?: string;
        };
        "controllers.deleteExecutionNEP413Doc": {
            /** @example base64-encoded 32 bytes */
            nonce?: string;
            /** @example last-mile.intents.near */
            recipient?: string;
        };
        "controllers.deleteExecutionRequestDoc": {
            nep413?: components["schemas"]["controllers.deleteExecutionNEP413Doc"];
            /** @example ed25519:... */
            publicKey?: string;
            /** @example ed25519:... or secp256k1:... */
            signature?: string;
            tonConnect?: components["schemas"]["controllers.tonConnectEnvelopeDoc"];
        };
        "controllers.errorResponse": {
            /** @example invalid request body */
            error?: string;
        };
        "controllers.executionDetailsDoc": {
            /** @example 60 */
            estimatedTime?: string;
            /** @example 0x0000000000000000000000000000000000000000 */
            intermediaryAddress?: string;
            /** @example false */
            messageSigned?: boolean;
            messageToSign?: string;
            /** @example 1000 */
            networkFee?: string;
            payload?: components["schemas"]["controllers.signingPayloadDoc"];
            /** @enum {string} */
            signingStandard?: "raw_ed25519" | "nep413" | "erc191" | "tip191" | "sep53" | "ton_connect";
        };
        "controllers.executionDoc": {
            /** @example 2026-04-28T09:00:00Z */
            createdAt?: string;
            details?: components["schemas"]["controllers.executionDetailsDoc"];
            /**
             * @example quote_with_steps
             * @enum {string}
             */
            executionMode?: "quote_with_steps" | "steps_only";
            /** @example 6f9619ff-8b86-d011-b42d-00cf4fc964ff */
            id?: string;
            metadata?: {
                [key: string]: unknown;
            };
            quote?: components["schemas"]["controllers.executionQuoteDoc"];
            /**
             * @example CREATED
             * @enum {string}
             */
            status?: "CREATED" | "DEPOSIT_PENDING" | "DEPOSIT_PROCESSING" | "OPERATION_PENDING" | "OPERATION_PROCESSING" | "SUCCESS" | "DEPOSIT_FAILED" | "OPERATION_FAILED" | "EXPIRED";
            /**
             * @description Steps are ExecutionStepEVM objects for EVM executions. For Solana executions
             *     (type=solana) each item is an executionStepSolanaDoc instead, echoed under this
             *     same steps key.
             */
            steps?: components["schemas"]["controllers.executionStepEVMDoc"][];
            /**
             * @example evm
             * @enum {string}
             */
            type?: "evm" | "solana";
            /** @example 1.0 */
            version?: string;
        };
        "controllers.executionListResponse": {
            result?: components["schemas"]["controllers.executionDoc"][];
        };
        "controllers.executionObjectResponse": {
            result?: components["schemas"]["controllers.executionDoc"];
        };
        "controllers.executionQuoteDoc": {
            /** @example 1000000 */
            amount?: string;
            amountIn?: string;
            amountInUsd?: string;
            amountOut?: string;
            amountOutUsd?: string;
            /** @example 2026-04-28T09:10:00Z */
            deadline?: string;
            /** @example 0x0000000000000000000000000000000000000000 */
            depositAddress?: string;
            /** @example 86825672 */
            depositMemo?: string;
            destinationAsset?: string;
            minAmountIn?: string;
            minAmountOut?: string;
            originAsset?: string;
            recipient?: string;
            /** @enum {string} */
            swapType?: "EXACT_INPUT" | "EXACT_OUTPUT";
        };
        "controllers.executionStepEVMDoc": {
            /** @example transfer(address,uint256) */
            functionSignature?: string;
            metadata?: {
                [key: string]: unknown;
            };
            parameters?: Record<string, never>[];
            /** @example 0x0000000000000000000000000000000000000000 */
            to?: string;
            /** @example 0 */
            value?: string;
        };
        "controllers.executionStepSolanaDoc": {
            accounts?: components["schemas"]["controllers.solanaAccountMetaDoc"][];
            args?: components["schemas"]["controllers.solanaArgDoc"][];
            /**
             * @description Discriminator is the hex-encoded instruction prefix: 8-byte Anchor
             *     discriminator or a 1-byte opcode. Omitted when the program takes none.
             * @example 03
             */
            discriminator?: string;
            metadata?: {
                [key: string]: unknown;
            };
            /** @example TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA */
            programId?: string;
        };
        "controllers.intermediaryResponse": {
            result?: components["schemas"]["controllers.intermediaryResult"];
        };
        "controllers.intermediaryResult": {
            /** @example 0x0000000000000000000000000000000000000000 */
            evm?: string;
            /** @example example.near */
            originAccount?: string;
            /**
             * @example near
             * @enum {string}
             */
            originType?: "evm" | "near" | "solana" | "stellar" | "ton" | "tron";
            /**
             * @description Solana is the MPC-derived ed25519 Solana intermediary account. Null when
             *     Solana is disabled or the derivation failed.
             * @example 4nn959rPTCxboxXKUxZwMq4knJMKPURA4WciuJyrDAvQ
             */
            solana?: string;
        };
        "controllers.signingPayloadDoc": {
            payload_bytes_base64?: string;
            payload_json?: string;
            /**
             * @example erc191
             * @enum {string}
             */
            standard?: "raw_ed25519" | "nep413" | "erc191" | "tip191" | "sep53" | "ton_connect";
        };
        "controllers.solanaAccountMetaDoc": {
            /** @example true */
            isSigner?: boolean;
            /** @example true */
            isWritable?: boolean;
            /**
             * @description Pubkey is a base58 account address or a placeholder sentinel
             *     ({INTERMEDIARY}, {DEPOSIT_ADDRESS}) resolved before encoding.
             * @example {INTERMEDIARY}
             */
            pubkey?: string;
        };
        "controllers.solanaArgDoc": {
            /** @example amount */
            name?: string;
            /**
             * @example u64
             * @enum {string}
             */
            type?: "u8" | "u16" | "u32" | "u64" | "u128" | "i8" | "i16" | "i32" | "i64" | "bool" | "pubkey" | "bytes" | "string";
            /**
             * @description Value is the JSON literal for the arg (number, string, bool) or a
             *     placeholder sentinel such as "{INTERMEDIARY}".
             */
            value?: Record<string, never>;
        };
        "controllers.statusResult": {
            /** @example SIGNING */
            status?: string;
        };
        "controllers.statusResultResponse": {
            result?: components["schemas"]["controllers.statusResult"];
        };
        "controllers.submitDepositRequestDoc": {
            /** @example 0x0000000000000000000000000000000000000000 */
            depositAddress?: string;
            /**
             * @description Memo identifies the execution together with depositAddress for MEMO deposit-mode chains (e.g. Stellar)
             * @example 86825672
             */
            memo?: string;
            /** @example 0x... */
            txHash?: string;
        };
        "controllers.submitSignatureRequestDoc": {
            /** @example 6f9619ff-8b86-d011-b42d-00cf4fc964ff */
            executionId?: string;
            /** @example ed25519:... */
            publicKey?: string;
            /** @example 0x... */
            signature?: string;
            tonConnect?: components["schemas"]["controllers.tonConnectEnvelopeDoc"];
        };
        "controllers.supportedTokensResult": {
            in?: components["schemas"]["controllers.token"][];
            out?: components["schemas"]["controllers.token"][];
        };
        "controllers.token": {
            /** @example nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near */
            assetId?: string;
            /** @example base */
            blockchain?: string;
            /** @example 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 */
            contractAddress?: string;
            /** @example 6 */
            decimals?: number;
            /** @example 1 */
            price?: number;
            /** @example 2026-04-28T09:00:00Z */
            priceUpdatedAt?: string;
            /** @example USDC */
            symbol?: string;
        };
        "controllers.tokenResponse": {
            result?: components["schemas"]["controllers.supportedTokensResult"];
        };
        "controllers.tonConnectEnvelopeDoc": {
            /** @example UQCmSKo4hxB429jCnRhycAnMFrGKIthLovG1U-JS6EBVIaqi */
            address?: string;
            /** @example app.example.com */
            domain?: string;
            /** @example 1747759882 */
            timestamp?: number;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
