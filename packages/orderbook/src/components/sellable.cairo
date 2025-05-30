#[starknet::component]
pub mod SellableComponent {
    // Starknet imports

    use starknet::ContractAddress;

    // Dojo imports

    use dojo::world::WorldStorage;

    // Internal imports

    use orderbook::constants::BOOK_ID;
    use orderbook::store::StoreTrait;
    use orderbook::types::category::Category;
    use orderbook::models::book::{BookTrait, BookAssert};
    use orderbook::models::order::{OrderTrait, OrderAssert};
    use orderbook::components::verifiable::{
        VerifiableComponent, VerifiableComponent::InternalImpl as VerifiableImpl,
    };

    // Storage

    #[storage]
    pub struct Storage {}

    // Events

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    #[generate_trait]
    pub impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +Drop<TContractState>,
        impl Verify: VerifiableComponent::HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        fn create(
            self: @ComponentState<TContractState>,
            world: WorldStorage,
            collection: ContractAddress,
            token_id: u256,
            quantity: u128,
            price: u128,
            currency: ContractAddress,
            expiration: u64,
        ) {
            // [Check] Book is not paused
            let mut store = StoreTrait::new(world);
            let mut book = store.book(BOOK_ID);
            book.assert_not_paused();

            // [Check] Validity requirements
            let caller_address = starknet::get_caller_address();
            let value: u256 = quantity.into();
            let verifiable = get_dep_component!(self, Verify);
            verifiable
                .assert_sell_validity(
                    owner: caller_address, collection: collection, token_id: token_id, value: value,
                );

            // [Effect] Create order
            let order_id = book.get_id();
            let time = starknet::get_block_timestamp();
            let order = OrderTrait::new(
                id: order_id,
                category: Category::Sell,
                collection: collection.into(),
                token_id: token_id,
                quantity: quantity,
                price: price,
                currency: currency.into(),
                expiration: expiration,
                now: time,
                owner: caller_address.into(),
            );

            // [Effect] Update models
            store.set_order(@order);
            store.set_book(@book);

            // [Event] Sale
            store.listing(order: order, time: time);
        }

        fn cancel(
            self: @ComponentState<TContractState>,
            world: WorldStorage,
            order_id: u32,
            collection: ContractAddress,
            token_id: u256,
        ) {
            // [Check] Book is not paused
            let mut store = StoreTrait::new(world);
            let book = store.book(BOOK_ID);
            book.assert_not_paused();

            // [Check] Order exists
            let mut order = store.order(order_id, collection.into(), token_id);
            order.assert_does_exist();

            // [Check] Order category
            order.assert_sell_order();

            // [Check] Caller is order owner
            let caller: felt252 = starknet::get_caller_address().into();
            order.assert_is_allowed(caller);

            // [Effect] Update order
            order.cancel();

            // [Effect] Update models
            store.set_order(@order);
        }

        fn delete(
            self: @ComponentState<TContractState>,
            world: WorldStorage,
            order_id: u32,
            collection: ContractAddress,
            token_id: u256,
        ) {
            // [Check] Book is not paused
            let mut store = StoreTrait::new(world);
            let book = store.book(BOOK_ID);
            book.assert_not_paused();

            // [Check] Order exists
            let mut order = store.order(order_id, collection.into(), token_id);
            order.assert_does_exist();

            // [Check] Order category
            order.assert_sell_order();

            // [Check] Inactive requirements
            let owner: ContractAddress = order.owner.try_into().unwrap();
            let collection: ContractAddress = order.collection.try_into().unwrap();
            let value: u256 = order.quantity.into();
            let verifiable = get_dep_component!(self, Verify);
            verifiable
                .assert_sell_invalidity(
                    owner: owner,
                    expiration: order.expiration,
                    collection: collection,
                    token_id: order.token_id,
                    value: value,
                );

            // [Effect] Update order
            order.delete();

            // [Effect] Update models
            store.set_order(@order);
        }

        fn execute(
            self: @ComponentState<TContractState>,
            world: WorldStorage,
            order_id: u32,
            collection: ContractAddress,
            token_id: u256,
            quantity: u128,
            royalties: bool,
        ) {
            // [Check] Book is not paused
            let mut store = StoreTrait::new(world);
            let book = store.book(BOOK_ID);
            book.assert_not_paused();

            // [Check] Order exists
            let mut order = store.order(order_id, collection.into(), token_id);
            order.assert_does_exist();

            // [Check] Order category
            order.assert_sell_order();

            // [Check] Validity requirements
            let owner: ContractAddress = order.owner.try_into().unwrap();
            let collection: ContractAddress = order.collection.try_into().unwrap();
            let token_id: u256 = order.token_id;
            let value: u256 = order.quantity.into();
            let verifiable = get_dep_component!(self, Verify);
            verifiable
                .assert_sell_validity(
                    owner: owner, collection: collection, token_id: token_id, value: value,
                );

            // [Check] Execute requirements
            let spender = starknet::get_caller_address();
            let currency: ContractAddress = order.currency.try_into().unwrap();
            let price: u256 = order.price.into();
            verifiable.assert_buy_validity(owner: spender, currency: currency, price: price);

            // [Effect] Execute order
            let time = starknet::get_block_timestamp();
            order.execute(quantity, time);

            // [Effect] Update models
            store.set_order(@order);

            // [Interaction] Process transfers
            let (orderbook_receiver, orderbook_fee) = book.fee(price);
            let (creator_receiver, creator_fee) = if royalties {
                verifiable.royalties(collection, token_id, price)
            } else {
                (starknet::get_contract_address(), 0)
            };
            verifiable
                .pay(
                    spender: spender,
                    recipient: orderbook_receiver.try_into().unwrap(),
                    currency: currency,
                    amount: orderbook_fee,
                );
            verifiable
                .pay(
                    spender: spender,
                    recipient: creator_receiver,
                    currency: currency,
                    amount: creator_fee,
                );
            verifiable
                .pay(
                    spender: spender,
                    recipient: owner,
                    currency: currency,
                    amount: price - orderbook_fee - creator_fee,
                );
            verifiable
                .transfer(
                    owner: owner,
                    collection: collection,
                    token_id: token_id,
                    value: value,
                    recipient: spender,
                );

            // [Event] Sale
            let from: felt252 = owner.into();
            let to: felt252 = spender.into();
            store.sale(order: order, from: from, to: to, time: time);
        }
    }
}
