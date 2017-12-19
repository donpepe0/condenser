import chai, { expect } from 'chai';
import chaiImmutable from 'chai-immutable';

import { Map, OrderedMap, getIn, List, fromJS, Set, merge } from 'immutable';
import { emptyContent } from 'app/redux/EmptyState';

import reducer, {
    defaultState,
    globalActionConstants,
    emptyContentMap,
    setCollapsed,
    receiveState,
    receiveAccount,
    receiveComment,
    receiveContent,
    linkReply,
    updateAccountWitnessVote,
    updateAccountWitnessProxy,
    deleteContent,
    voted,
    fetchingData,
    receiveData,
    receiveRecentPosts,
    requestMeta,
    receiveMeta,
    set,
    remove,
    update,
    setMetaData,
    clearMeta,
    fetchJson,
    fetchJsonResult,
    showDialog,
    hideDialog,
    getState,
} from './GlobalReducer';

chai.use(chaiImmutable);

const expectedStats = Map({
    isNsfw: false,
    hide: false,
    hasPendingPayout: false,
    gray: false,
    flagWeight: 0,
    up_votes: 0,
    total_votes: 0,
    authorRepLog10: undefined,
    allowDelete: true,
});

const mockPayloads = {
    setCollapsed: {
        post: 'the city',
        collapsed: 'is now collapsed',
    },
    receiveState: {
        content: Map({ barman: Map({ foo: 'choo', stats: '' }) }),
    },
    receiveAccount: {
        account: {
            name: 'adorno',
            witness_votes: 99,
            beList: ['alice', 'bob', 'claire'],
            beOrderedMap: { foo: 'barman' },
        },
    },
    receiveComment: {
        op: {
            author: 'critic',
            permlink: 'critical-comment',
            parent_author: 'Yerofeyev',
            parent_permlink: 'moscow-stations',
            title: 'moscow to the end of the line',
            body: 'corpus of the text',
        },
    },
    receiveContent: {
        content: {
            author: 'sebald',
            permlink: 'rings-of-saturn',
            active_votes: { one: { percent: 30 }, two: { percent: 70 } },
        },
    },
    linkReply: {
        author: 'critic',
        permlink: 'critical-comment',
        parent_author: 'Yerofeyev',
        parent_permlink: 'moscow-stations',
        title: 'moscow to the end of the line',
        body: 'corpus of the text',
    },
    updateAccountWitnessVote: {
        account: 'Smee',
        witness: 'Greech',
        approve: true,
    },
    updateAccountWitnessProxy: {
        account: 'Alice',
        proxy: 'Jane',
    },
    deleteContent: {
        author: 'sebald',
        permlink: 'rings-of-sebald',
    },
    fetchingData: {
        order: 'cheeseburger',
        category: 'life',
    },
    receiveData: {
        data: [
            {
                author: 'smudge',
                permlink: 'klop',
                active_votes: { one: { percent: 30 }, two: { percent: 70 } },
            },
        ],
        order: 'by_author',
        category: 'blog',
        accountname: 'alice',
    },
};

describe('Global reducer', () => {
    it('should provide a nice initial state', () => {
        const initial = reducer();
        expect(initial).to.equal(defaultState);
    });
    it('should return correct state for a SET_COLLAPSED action', () => {
        const initial = reducer().set(
            'content',
            Map({
                [mockPayloads.setCollapsed.post]: Map({}),
            })
        );
        const actual = reducer(
            initial,
            setCollapsed(mockPayloads.setCollapsed)
        );
        expect(
            actual.getIn([
                'content',
                mockPayloads.setCollapsed.post,
                'collapsed',
            ])
        ).to.eql(mockPayloads.setCollapsed.collapsed);
    });
    it('should return correct state for a RECEIVE_STATE action', () => {
        const initial = reducer();
        const actual = reducer(
            initial,
            receiveState(mockPayloads.receiveState)
        );

        expect(actual.getIn(['content', 'barman', 'foo'])).to.eql('choo');
        expect(actual.getIn(['content', 'barman', 'stats'])).to.eql(
            expectedStats
        );
    });

    it('should return correct state for a RECEIVE_ACCOUNT action', () => {
        const payload = mockPayloads.receiveAccount;
        const initial = reducer();
        const actual = reducer(initial, receiveAccount(payload));
        const expected = Map({
            status: {},
            accounts: Map({
                adorno: Map({
                    name: 'adorno',
                    witness_votes: 99,
                    be_List: List(['alice', 'bob', 'claire']),
                    be_orderedMap: OrderedMap({ foo: 'barman' }),
                }),
            }),
        });
        expect(actual.getIn(['accounts', payload.account.name, 'name'])).to.eql(
            payload.account.name
        );
        expect(
            actual.getIn(['accounts', payload.account.name, 'beList'])
        ).to.eql(List(payload.account.beList));
        expect(
            actual.getIn(['accounts', payload.account.name, 'beOrderedMap'])
        ).to.eql(OrderedMap(payload.account.beOrderedMap));
    });

    it('should return correct state for a RECEIVE_COMMENT action', () => {
        const payload = mockPayloads.receiveComment;
        const {
            author,
            permlink,
            parent_author,
            parent_permlink,
            title,
            body,
        } = payload.op;
        const initial = reducer();
        const actual = reducer(initial, receiveComment(payload));
        expect(
            actual.getIn(['content', `${author}/${permlink}`])
        ).to.include.all.keys(
            ...Object.keys(emptyContent),
            ...Object.keys(payload.op)
        );
        // With Parent.
        expect(
            actual.getIn(['content', `${parent_author}/${parent_permlink}`])
        ).to.include.all.keys('replies', 'children');
        // Without Parent.
        payload.op.parent_author = '';
        const actual2 = reducer(initial, receiveComment(payload));
        expect(
            actual2.getIn(['content', `${parent_author}/${parent_permlink}`])
        ).to.eql(undefined);
    });
    it('should return correct state for a RECEIVE_CONTENT action', () => {
        const payload = mockPayloads.receiveContent;
        const { author, permlink, active_votes } = payload.content;
        const initial = reducer();
        const actual = reducer(initial, receiveContent(payload));
        expect(
            actual.getIn(['content', `${author}/${permlink}`])
        ).to.include.all.keys(
            ...Object.keys(emptyContent),
            ...Object.keys(payload.content)
        );
        expect(
            actual.getIn(['content', `${author}/${permlink}`, 'active_votes'])
        ).to.eql(fromJS(active_votes));
    });

    it('should return correct state for a LINK_REPLY action', () => {
        let payload = mockPayloads.linkReply;
        const initial = reducer();
        let actual = reducer(initial, linkReply(payload));
        const expected = Map({
            [payload.parent_author + '/' + payload.parent_permlink]: Map({
                replies: List([`${payload.author}/${payload.permlink}`]),
                children: 1,
            }),
        });
        expect(actual.get('content')).to.eql(expected);
        // Remove parent
        payload.parent_author = '';
        actual = reducer(initial, linkReply(payload));
        expect(actual).to.eql(initial);
    });
    it('should return correct state for a UPDATE_ACCOUNT_WITNESS_VOTE action', () => {
        let payload = mockPayloads.updateAccountWitnessVote;
        const initial = reducer();
        let actual = reducer(initial, updateAccountWitnessVote(payload));
        expect(
            actual.getIn(['accounts', payload.account, 'witness_votes'])
        ).to.eql(Set([payload.witness]));
        // set approve to false
        payload.approve = false;
        actual = reducer(initial, updateAccountWitnessVote(payload));
        expect(actual).to.eql(initial);
    });
    it('should return correct state for a UPDATE_ACCOUNT_WITNESS_VOTE action', () => {
        let payload = mockPayloads.updateAccountWitnessProxy;
        const initial = reducer();
        const actual = reducer(initial, updateAccountWitnessProxy(payload));
        const expected = Map({ proxy: payload.proxy });
        expect(actual.getIn(['accounts', payload.account])).to.eql(expected);
    });
    it('should return correct state for a DELETE_CONTENT action', () => {
        let payload = mockPayloads.deleteContent;
        let initial = reducer();
        // add content
        const initWithContent = initial.setIn(
            ['content', `${payload.author}/${payload.permlink}`],
            Map({
                author: 'sebald',
                permlink: 'rings-of-saturn',
                parent_author: '',
                active_votes: { one: { percent: 30 }, two: { percent: 70 } },
                replies: List(['cool', 'mule']),
            })
        );
        let actual = reducer(initWithContent, deleteContent(payload));
        let expected = Map({});
        expect(actual.get('content')).to.eql(expected);
        const initWithContentAndParent = initial.setIn(
            ['content', `${payload.author}/${payload.permlink}`],
            Map({
                author: 'sebald',
                permlink: 'rings-of-saturn',
                parent_author: 'alice',
                parent_permlink: 'bob',
                active_votes: { one: { percent: 30 }, two: { percent: 70 } },
            })
        );
        const initWithParentKeyContent = initWithContentAndParent.setIn(
            ['content', 'alice/bob'],
            Map({
                replies: [
                    `${payload.author}/${payload.permlink}`,
                    'dorothy-hughes/in-a-lonely-place',
                    'artichoke/hearts',
                ],
            })
        );
        actual = reducer(initWithParentKeyContent, deleteContent(payload));
        expected = Map({
            replies: ['dorothy-hughes/in-a-lonely-place', 'artichoke/hearts'],
        });
        expect(
            actual.getIn(['content', 'alice/bob', 'replies'])
        ).to.have.length(2);
    });
    it('should return correct state for a FETCHING_DATA action', () => {
        const payload = mockPayloads.fetchingData;
        const initWithCategory = reducer().setIn(
            ['status'],
            Map({
                [payload.category]: Map({
                    [payload.order]: { fetching: false },
                }),
            })
        );
        const actual = reducer(initWithCategory, fetchingData(payload));
        expect(
            actual.getIn(['status', payload.category, payload.order])
        ).to.eql({ fetching: true });
    });
    it('should return correct state for a RECEIVE_DATA action', () => {
        let payload = mockPayloads.receiveData;
        const initWithData = reducer().merge({
            accounts: Map({
                [payload.accountname]: Map({
                    [payload.category]: List([
                        { data: { author: 'farm', permlink: 'barn' } },
                    ]),
                }),
            }),
            content: Map({}),
            status: Map({
                [payload.category]: Map({
                    [payload.order]: {},
                }),
            }),
            discussion_idx: Map({
                [payload.category]: Map({
                    UnusualOrder: List([
                        { data: { author: 'ship', permlink: 'bridge' } },
                    ]),
                }),
                '': Map({
                    FebrileFriday: List([]),
                }),
            }),
        });
        const actual1 = reducer(initWithData, receiveData(payload));

        expect(actual1.getIn(['content', 'author'])).to.eql(payload.author);
        expect(actual1.getIn(['content', 'permlink'])).to.eql(payload.permlink);
        expect(actual1.getIn(['content', 'active_vites'])).to.eql(
            payload.active_votes
        );
        expect(
            actual1.getIn([
                'content',
                `${payload.data[0].author}/${payload.data[0].permlink}`,
                'stats',
                'allowDelete',
            ])
        ).to.eql(false);

        // Push new key to posts list, If order meets the condition.
        expect(
            actual1.getIn(['accounts', payload.accountname, payload.category])
        ).to.deep.include(
            `${payload.data[0].author}/${payload.data[0].permlink}`
        );
        // Push new key to discussion_idx list, If order does not meet the condition.
        payload.order = 'UnusualOrder';
        const actual2 = reducer(initWithData, receiveData(payload));
        expect(
            actual2.getIn(['discussion_idx', payload.category, payload.order])
        ).to.deep.include(
            `${payload.data[0].author}/${payload.data[0].permlink}`
        );
        // handle falsey payload category by setting empty string at keypath location typically occupied by category.
        payload.order = 'FebrileFriday';
        payload.category = false;
        const actual3 = reducer(initWithData, receiveData(payload));
        expect(
            actual3.getIn(['discussion_idx', '', payload.order])
        ).to.deep.include(
            `${payload.data[0].author}/${payload.data[0].permlink}`
        );
    });
    /*
    case RECEIVE_RECENT_POSTS: {
        const { data } = payload;
        let new_state = state.updateIn(
            ['discussion_idx', '', 'created'],
            list => {
                if (!list) list = List();
                return list.withMutations(posts => {
                    data.forEach(value => {
                        const entry = `${value.author}/${value.permlink}`;
                        if (!posts.includes(entry)) posts.unshift(entry);
                    });
                });
            }
        );
        new_state = new_state.updateIn(['content'], content => {
            return content.withMutations(map => {
                data.forEach(value => {
                    const key = `${value.author}/${value.permlink}`;
                    if (!map.has(key)) {
                        value = fromJS(value);
                        value = value.set(
                            'stats',
                            fromJS(contentStats(value))
                        );
                        map.set(key, value);
                    }
                });
            });
        });
        return new_state;
    }
    */
});
