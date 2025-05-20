// Internal imports

pub use orderbook::constants::VERSION;
pub use orderbook::models::index::Book;

// Errors

pub mod errors {
    pub const BOOK_INVALID_OWNER: felt252 = 'Book: invalid owner';
    pub const BOOK_IS_PAUSED: felt252 = 'Book: is paused';
    pub const BOOK_CANNOT_PAUSE: felt252 = 'Book: cannot be paused';
    pub const BOOK_CANNOT_RESUME: felt252 = 'Book: cannot be resumed';
}

#[generate_trait]
pub impl BookImpl of BookTrait {
    #[inline]
    fn new(id: u32, owner: felt252) -> Book {
        // [Check] Inputs
        BookAssert::assert_valid_owner(owner);
        // [Return] Book
        Book { id: id, version: VERSION, paused: false, counter: 0, owner: owner }
    }

    #[inline]
    fn get_id(ref self: Book) -> u32 {
        // [Effect] Increment counter
        self.counter += 1;
        // [Return] New counter
        self.counter
    }

    #[inline]
    fn pause(ref self: Book) {
        // [Check] Book can be paused
        self.assert_can_pause();
        // [Update] Book
        self.paused = true;
    }

    #[inline]
    fn resume(ref self: Book) {
        // [Check] Book can be resumed
        self.assert_can_resume();
        // [Update] Book
        self.paused = false;
    }
}

#[generate_trait]
pub impl BookAssert of AssertTrait {
    #[inline]
    fn assert_valid_owner(owner: felt252) {
        assert(owner != 0, errors::BOOK_INVALID_OWNER);
    }

    #[inline]
    fn assert_can_pause(self: Book) {
        assert(!self.paused, errors::BOOK_CANNOT_PAUSE);
    }

    #[inline]
    fn assert_can_resume(self: Book) {
        assert(!self.paused, errors::BOOK_CANNOT_RESUME);
    }

    #[inline]
    fn assert_not_paused(self: Book) {
        assert(!self.paused, errors::BOOK_IS_PAUSED);
    }
}

#[cfg(test)]
mod tests {
    // Local imports

    use orderbook::constants::{BOOK_ID, VERSION};
    use super::{BookTrait, BookAssert};

    // Constants

    const OWNER: felt252 = 'OWNER';

    #[test]
    fn test_book_new() {
        let book = BookTrait::new(BOOK_ID, OWNER);
        assert_eq!(book.id, BOOK_ID);
        assert_eq!(book.version, VERSION);
        assert_eq!(book.paused, false);
        assert_eq!(book.counter, 0);
        assert_eq!(book.owner, OWNER);
    }
}
