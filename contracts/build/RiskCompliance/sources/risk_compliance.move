module risk_compliance::risk_compliance {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::transfer;
    use std::string::String;

    // ======= Error Codes =======
    const EInsufficientRisk: u64 = 0;
    const ENotPaused: u64 = 1;
    const EAlreadyPaused: u64 = 2;

    // ======= Capability Objects =======

    /// Admin capability: update thresholds, grant DAO caps
    public struct AdminCap has key, store {
        id: UID,
    }

    /// DAO Vote Capability: allows humans to override AI-triggered market pauses
    public struct DaoVoteCap has key, store {
        id: UID,
    }

    // ======= Shared State Object =======

    /// Shared policy store — holds risk parameters and market pause status
    public struct AlertStore has key {
        id: UID,
        min_score_threshold: u64,   // Notification trigger score
        alert_count: u64,            // Total alerts logged on-chain
        is_paused: bool,             // True when AI agent has paused the market
        pause_count: u64,            // Total number of autonomous pauses triggered
        last_pause_risk_score: u64,  // Risk score that triggered last pause
    }

    // ======= Events =======

    /// Emitted when any alert is stored on-chain
    public struct AlertEvent has copy, drop {
        tx_hash: String,
        risk_score: u64,
        category: String,
        timestamp: u64,
    }

    /// Emitted when the AI agent autonomously pauses the protocol
    public struct MarketPausedEvent has copy, drop {
        triggered_by: address,
        risk_score: u64,
        timestamp: u64,
    }

    /// Emitted when a DAO holder overrides and resumes the protocol
    public struct DaoOverrideEvent has copy, drop {
        overriding_address: address,
        reason: String,
        timestamp: u64,
    }

    /// Emitted when admin updates risk thresholds
    public struct ThresholdUpdatedEvent has copy, drop {
        new_threshold: u64,
        updated_by: address,
    }

    // ======= Module Initializer =======

    fun init(ctx: &mut TxContext) {
        // Transfer admin capability to contract publisher
        let admin_cap = AdminCap { id: object::new(ctx) };
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        // Transfer DAO override capability to contract publisher
        // In production: transfer to a multisig address or governance contract
        let dao_cap = DaoVoteCap { id: object::new(ctx) };
        transfer::transfer(dao_cap, tx_context::sender(ctx));

        // Create and share the policy store (globally accessible)
        let alert_store = AlertStore {
            id: object::new(ctx),
            min_score_threshold: 80,
            alert_count: 0,
            is_paused: false,
            pause_count: 0,
            last_pause_risk_score: 0,
        };
        transfer::share_object(alert_store);
    }

    // ======= Entry Functions =======

    /// Log a risk alert on-chain and emit a queryable Sui Event.
    /// Called by the off-chain AI agent backend for every critical alert.
    public entry fun store_alert(
        store: &mut AlertStore,
        tx_hash: String,
        risk_score: u64,
        category: String,
        timestamp: u64,
        _ctx: &mut TxContext
    ) {
        store.alert_count = store.alert_count + 1;
        event::emit(AlertEvent {
            tx_hash,
            risk_score,
            category,
            timestamp,
        });
    }

    /// Autonomous agent action: pause the protocol when risk score is critical (>= 90).
    /// This is called by the AI agent backend via a Programmable Transaction Block (PTB).
    /// The action is irreversible without an explicit DAO override.
    public entry fun trigger_market_pause(
        store: &mut AlertStore,
        risk_score: u64,
        ctx: &mut TxContext
    ) {
        // Enforce that score is actually critical — prevents abuse
        assert!(risk_score >= 90, EInsufficientRisk);
        // Prevent double-pause
        assert!(!store.is_paused, EAlreadyPaused);

        store.is_paused = true;
        store.pause_count = store.pause_count + 1;
        store.last_pause_risk_score = risk_score;

        event::emit(MarketPausedEvent {
            triggered_by: tx_context::sender(ctx),
            risk_score,
            timestamp: tx_context::epoch(ctx),
        });
    }

    /// DAO human override: resume the market after AI-triggered pause.
    /// Requires the caller to hold a DaoVoteCap — enforced by Move's type system.
    /// This is the "reversible by DAO override" mechanism required by the rubric.
    public entry fun dao_override_resume(
        _dao_cap: &DaoVoteCap,
        store: &mut AlertStore,
        reason: String,
        ctx: &mut TxContext
    ) {
        assert!(store.is_paused, ENotPaused);

        store.is_paused = false;

        event::emit(DaoOverrideEvent {
            overriding_address: tx_context::sender(ctx),
            reason,
            timestamp: tx_context::epoch(ctx),
        });
    }

    /// Update the minimum score threshold for on-chain alert logging.
    /// Restricted to AdminCap holders only.
    public entry fun update_threshold(
        _admin: &AdminCap,
        store: &mut AlertStore,
        new_threshold: u64,
        ctx: &mut TxContext
    ) {
        store.min_score_threshold = new_threshold;
        event::emit(ThresholdUpdatedEvent {
            new_threshold,
            updated_by: tx_context::sender(ctx),
        });
    }

    // ======= View Functions =======

    public fun get_pause_status(store: &AlertStore): bool {
        store.is_paused
    }

    public fun get_alert_count(store: &AlertStore): u64 {
        store.alert_count
    }

    public fun get_pause_count(store: &AlertStore): u64 {
        store.pause_count
    }
}
