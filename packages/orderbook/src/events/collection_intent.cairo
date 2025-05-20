// Internal imports

pub use orderbook::events::index::CollectionIntent;
pub use orderbook::models::index::Intent;

// Errors

pub mod errors {
    pub const COLLECTION_INTENT_INVALID_ORDER: felt252 = 'Offer: invalid offer';
    pub const COLLECTION_INTENT_INVALID_ADDRESS: felt252 = 'Offer: invalid address';
}

#[generate_trait]
pub impl CollectionIntentImpl of CollectionIntentTrait {
    #[inline]
    fn new(intent: Intent, time: u64) -> CollectionIntent {
        // [Check] Inputs
        CollectionIntentAssert::assert_valid_offer(intent.id);
        // [Return] CollectionIntent
        CollectionIntent { intent_id: intent.id, intent: intent, time: time }
    }
}

#[generate_trait]
pub impl CollectionIntentAssert of AssertTrait {
    #[inline]
    fn assert_valid_offer(offer_id: u32) {
        assert(offer_id != 0, errors::COLLECTION_INTENT_INVALID_ORDER);
    }
}

#[cfg(test)]
mod tests {
    // Local imports

    pub use orderbook::models::intent::{Intent, IntentTrait};
    use super::{CollectionIntentTrait, CollectionIntentAssert};

    // Constants

    const INTENT_ID: u32 = 1;
    const FROM: felt252 = 'FROM';
    const TO: felt252 = 'TO';
    const TIME: u64 = 1622547801;

    #[test]
    fn test_collection_intent_new() {
        let intent: Intent = IntentTrait::new(
            INTENT_ID, 'COLLECTION', 100, 1234, 'CURRENCY', 1622547801, 1622547800, 'OWNER',
        );
        let collection_intent = CollectionIntentTrait::new(intent, TIME);
        assert_eq!(collection_intent.intent_id, INTENT_ID);
        assert_eq!(collection_intent.time, TIME);
    }
}
