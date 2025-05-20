/// TODO: Delete if not used
// Internal imports

pub use orderbook::models::index::Offer;
pub use orderbook::types::status::Status;

// Errors

pub mod errors {
    pub const OFFER_ALREADY_EXISTS: felt252 = 'Offer: already exists';
    pub const OFFER_NOT_EXIST: felt252 = 'Offer: does not exist';
    pub const OFFER_CALLER_NOT_ALLOWED: felt252 = 'Offer: caller not allowed';
    pub const OFFER_CANNOT_EXECUTE: felt252 = 'Offer: cannot be executed';
    pub const OFFER_CANNOT_CANCEL: felt252 = 'Offer: cannot be canceled';
    pub const OFFER_CANNOT_DELETE: felt252 = 'Offer: cannot be deleted';
    pub const OFFER_INVALID_COLLECTION: felt252 = 'Offer: invalid collection';
    pub const OFFER_INVALID_PRICE: felt252 = 'Offer: invalid price';
    pub const OFFER_INVALID_CURRENCY: felt252 = 'Offer: invalid currency';
    pub const OFFER_INVALID_EXPIRATION: felt252 = 'Offer: invalid expiration';
}

#[generate_trait]
pub impl OfferImpl of OfferTrait {
    #[inline]
    fn new(
        id: u32,
        collection: felt252,
        token_id: u256,
        quantity: felt252,
        price: felt252,
        currency: felt252,
        expiration: u64,
        now: u64,
        owner: felt252,
    ) -> Offer {
        // [Check] Inputs
        OfferAssert::assert_valid_collection(collection);
        OfferAssert::assert_valid_price(price);
        OfferAssert::assert_valid_currency(currency);
        OfferAssert::assert_valid_expiration(expiration, now);
        // [Return] Offer
        Offer {
            id: id,
            status: Status::Placed.into(),
            expiration: expiration,
            collection: collection,
            token_id: token_id,
            quantity: quantity,
            price: price,
            currency: currency,
            owner: owner,
        }
    }

    #[inline]
    fn execute(ref self: Offer) {
        // [Check] Offer can be closed
        self.assert_can_execute();
        // [Update] Offer
        self.nullify();
    }

    #[inline]
    fn cancel(ref self: Offer) {
        // [Check] Offer can be closed
        self.assert_can_cancel();
        // [Update] Offer
        self.nullify();
    }

    #[inline]
    fn delete(ref self: Offer) {
        // [Check] Offer can be closed
        self.assert_can_delete();
        // [Update] Offer
        self.nullify();
    }

    #[inline]
    fn nullify(ref self: Offer) {
        // [Update] Offer
        self.status = Status::None.into();
    }
}

#[generate_trait]
pub impl OfferAssert of AssertTrait {
    #[inline]
    fn assert_does_not_exist(self: @Offer) {
        assert(*self.status == Status::None.into(), errors::OFFER_ALREADY_EXISTS);
    }

    #[inline]
    fn assert_does_exist(self: @Offer) {
        assert(*self.status != Status::None.into(), errors::OFFER_NOT_EXIST);
    }

    #[inline]
    fn assert_is_allowed(self: @Offer, caller: felt252) {
        assert(*self.owner == caller, errors::OFFER_CALLER_NOT_ALLOWED);
    }

    #[inline]
    fn assert_can_execute(self: @Offer) {
        assert(*self.status == Status::Placed.into(), errors::OFFER_CANNOT_EXECUTE);
    }

    #[inline]
    fn assert_can_delete(self: @Offer) {
        assert(*self.status == Status::Placed.into(), errors::OFFER_CANNOT_DELETE);
    }

    #[inline]
    fn assert_can_cancel(self: @Offer) {
        assert(*self.status == Status::Placed.into(), errors::OFFER_CANNOT_CANCEL);
    }

    #[inline]
    fn assert_valid_collection(collection: felt252) {
        assert(collection != 0, errors::OFFER_INVALID_COLLECTION);
    }

    #[inline]
    fn assert_valid_price(price: felt252) {
        assert(price != 0, errors::OFFER_INVALID_PRICE);
    }

    #[inline]
    fn assert_valid_currency(currency: felt252) {
        assert(currency != 0, errors::OFFER_INVALID_CURRENCY);
    }

    #[inline]
    fn assert_valid_expiration(time: u64, now: u64) {
        assert(time > now, errors::OFFER_INVALID_EXPIRATION);
    }
}

#[cfg(test)]
mod tests {
    // Local imports

    use super::{OfferTrait, OfferAssert};

    // Constants

    const OFFER_ID: u32 = 1;
    const COLLECTION: felt252 = 'COLLECTION';
    const TOKEN_ID: u256 = 42;
    const QUANTITY: felt252 = 100;
    const PRICE: felt252 = 1234;
    const CURRENCY: felt252 = 'CURRENCY';
    const EXPIRATION: u64 = 1622547801;
    const NOW: u64 = 1622547800;
    const SPENDER: felt252 = 'SPENDER';

    #[test]
    fn test_offer_new() {
        let offer = OfferTrait::new(
            OFFER_ID, COLLECTION, TOKEN_ID, QUANTITY, PRICE, CURRENCY, EXPIRATION, NOW, SPENDER,
        );
        assert_eq!(offer.id, OFFER_ID);
        assert_eq!(offer.collection, COLLECTION);
        assert_eq!(offer.token_id, TOKEN_ID);
        assert_eq!(offer.quantity, QUANTITY);
        assert_eq!(offer.price, PRICE);
        assert_eq!(offer.currency, CURRENCY);
        assert_eq!(offer.expiration, 0);
    }
}
