/// TODO: Delete if not used
// Internal imports

pub use orderbook::models::index::Intent;

// Errors

pub mod errors {
    pub const INTENT_ALREADY_EXISTS: felt252 = 'Intent: already exists';
    pub const INTENT_NOT_EXIST: felt252 = 'Intent: does not exist';
    pub const INTENT_CANNOT_EXECUTE: felt252 = 'Intent: cannot be executed';
    pub const INTENT_CANNOT_CANCEL: felt252 = 'Intent: cannot be canceled';
    pub const INTENT_CANNOT_DELETE: felt252 = 'Intent: cannot be deleted';
    pub const INTENT_INVALID_COLLECTION: felt252 = 'Intent: invalid collection';
    pub const INTENT_INVALID_PRICE: felt252 = 'Intent: invalid price';
    pub const INTENT_INVALID_CURRENCY: felt252 = 'Intent: invalid currency';
    pub const INTENT_INVALID_EXPIRATION: felt252 = 'Intent: invalid expiration';
}

#[generate_trait]
pub impl IntentImpl of IntentTrait {
    #[inline]
    fn new(
        id: u32,
        collection: felt252,
        quantity: felt252,
        price: felt252,
        currency: felt252,
        expiration: u64,
        now: u64,
        owner: felt252,
    ) -> Intent {
        // [Check] Inputs
        IntentAssert::assert_valid_collection(collection);
        IntentAssert::assert_valid_price(price);
        IntentAssert::assert_valid_currency(currency);
        IntentAssert::assert_valid_expiration(expiration, now);
        // [Return] Intent
        Intent {
            id: id,
            expiration: expiration,
            collection: collection,
            quantity: quantity,
            price: price,
            currency: currency,
            owner: owner,
        }
    }

    #[inline]
    fn execute(ref self: Intent) {
        // [Check] Intent can be closed
        self.assert_can_execute();
        // [Update] Intent
        self.nullify();
    }

    #[inline]
    fn cancel(ref self: Intent) {
        // [Check] Intent can be closed
        self.assert_can_cancel();
        // [Update] Intent
        self.nullify();
    }

    #[inline]
    fn delete(ref self: Intent) {
        // [Check] Intent can be closed
        self.assert_can_delete();
        // [Update] Intent
        self.nullify();
    }

    #[inline]
    fn nullify(ref self: Intent) {
        // [Update] Intent
        self.collection = Default::default();
        self.quantity = Default::default();
        self.price = Default::default();
        self.currency = Default::default();
        self.expiration = Default::default();
        self.owner = Default::default();
    }
}

#[generate_trait]
pub impl IntentAssert of AssertTrait {
    #[inline]
    fn assert_does_not_exist(self: @Intent) {
        assert(*self.owner == 0, errors::INTENT_ALREADY_EXISTS);
    }

    #[inline]
    fn assert_does_exist(self: @Intent) {
        assert(*self.owner != 0, errors::INTENT_NOT_EXIST);
    }

    #[inline]
    fn assert_can_execute(self: @Intent) {
        assert(*self.owner != 0, errors::INTENT_CANNOT_EXECUTE);
    }

    #[inline]
    fn assert_can_delete(self: @Intent) {
        assert(*self.owner != 0, errors::INTENT_CANNOT_DELETE);
    }

    #[inline]
    fn assert_can_cancel(self: @Intent) {
        assert(*self.owner != 0, errors::INTENT_CANNOT_CANCEL);
    }

    #[inline]
    fn assert_valid_collection(collection: felt252) {
        assert(collection != 0, errors::INTENT_INVALID_COLLECTION);
    }

    #[inline]
    fn assert_valid_price(price: felt252) {
        assert(price != 0, errors::INTENT_INVALID_PRICE);
    }

    #[inline]
    fn assert_valid_currency(currency: felt252) {
        assert(currency != 0, errors::INTENT_INVALID_CURRENCY);
    }

    #[inline]
    fn assert_valid_expiration(time: u64, now: u64) {
        assert(time > now, errors::INTENT_INVALID_EXPIRATION);
    }
}

#[cfg(test)]
mod tests {
    // Local imports

    use super::{IntentTrait, IntentAssert};

    // Constants

    const INTENT_ID: u32 = 1;
    const COLLECTION: felt252 = 'COLLECTION';
    const QUANTITY: felt252 = 100;
    const PRICE: felt252 = 1234;
    const CURRENCY: felt252 = 'CURRENCY';
    const EXPIRATION: u64 = 1622547800;
    const NOW: u64 = 1622547799;
    const SPENDER: felt252 = 'SPENDER';

    #[test]
    fn test_intent_new() {
        let intent = IntentTrait::new(
            INTENT_ID, COLLECTION, QUANTITY, PRICE, CURRENCY, EXPIRATION, NOW, SPENDER,
        );
        assert_eq!(intent.id, INTENT_ID);
        assert_eq!(intent.collection, COLLECTION);
        assert_eq!(intent.quantity, QUANTITY);
        assert_eq!(intent.price, PRICE);
        assert_eq!(intent.currency, CURRENCY);
        assert_eq!(intent.expiration, 0);
    }
}
