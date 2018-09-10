const traverse = require('traverse');
const {transform} = require('./transform');

function main() {
    const original = Object.freeze({
        id: 123,
        title: 'Bicycle 123',
        description: 'Bicycle 123 is a fabulous item that you have to spend all your money on',
        updatedAt: '2017-10-13T10:37:47',
        bicycleType: 'Hybrid',
        brand: 'Brand-Company C',
        price: 500,
        color: ['Red', 'Black', 'White'],
        productCategory: 'Bicycle',
        inStok: true,
        inStockCount: '100',
        quantityOnHand: null,
        relatedItems: [341, 472, 649],
        tags: {
            hot: {author: 'anonymousUser1', timestamp: '2016MMDDHHmmssSSS'},
            seasonal: {author: 'anonymousUser2', timestamp: '2017MMDDHHmmssSSS'},
            personalTransportation: {author: 'memberUser3', timestamp: '2015MMDDHHmmssSSS'},
            'tag-name-with-dash': {author: 'memberUser4', timestamp: '2015MMDDHHmmssSSS'},
            'tag name with spaces': {author: 'memberUser5', timestamp: '2015MMDDHHmmssSSS'},
            'tag.name.with.dots': {author: 'memberUser6', timestamp: '2015MMDDHHmmssSSS'},
        },
        pictures: [
            {
                view: 'front',
                images: [{big: 'http://example.com/products/123_front.jpg'}, {thumbnail: 'http://example.com/products/123_front_small.jpg'}]
            },
            {
                view: 'rear',
                images: [{big: 'http://example.com/products/123_rear.jpg'}, {thumbnail: 'http://example.com/products/123_rear_small.jpg'}]
            },
            {
                view: 'side',
                images: [{big: 'http://example.com/products/123_left_side.jpg'}, {thumbnail: 'http://example.com/products/123_left_side_small.jpg'}]
            }
        ],
        productReview: {
            fiveStar: [
                {
                    author: 'user1@domain1.com',
                    'first.name': 'user1',
                    comment: "Excellent! Can't recommend it highly enough! Buy it!",
                    score: 5,
                    viewAs: '*****'
                },
                {
                    author: 'user2@domain2.com',
                    'first.name': 'user2',
                    comment: 'Do yourself a favor and buy this.',
                    score: 5,
                    viewAs: '*****'
                }
            ],
            oneStar: [
                {
                    author: 'user3@domain3.com',
                    'first.name': 'user3',
                    comment: 'Terrible product! Do no buy this.',
                    score: 1,
                    viewAs: '*----'
                }
            ]
        },
        comment: '/HOME/This product sells out quickly during the summer',
        'Safety.Warning.On.Root': 'Always wear a helmet' // attribute name with `.`
    });

    const template = {
        name: '{{title}}',
        reviews: {
            high: [1, 2, 'prelude', {keyBefore: 'literal value before'}, ['a', 'b', 'c'], '{{productReview.fiveStar.length}}', '{>> {productReview.fiveStar[0]}}', {
                praise: '{+{["author","comment"]}}',
                stars: '{{viewAs}}'
            }, {keyAfter: 'literal value after'}
            ],
            low: ['{>> {productReview.oneStar}}', {
                criticism: '{{[(@.length - 1)].comment}}'
            }],
            disclaimer: 'Ad: {{comment}}'
        },
        reviewsSummary: ['{>>{productReview}}', '{+{$..score}}'], // render next n nodes with leading rendered item as scoped-document
        views: ['{%% {pictures}}', '[{{view}}]({{images.length}})'], // for-each item in enumerable template, render with next node
        twoimages: ['{+ %2 {pictures..images}}', 'front -> {{[1].thumbnail}}', 'rear -> {{[1].thumbnail}}', 'side -> {?=default:Not Available{[1].thumbnail}}'], // zip-align
        images: ['{+ %* {pictures..images}}', 'front -> {{[1].thumbnail}}', 'rear -> {{[1].thumbnail}}', 'side -> {{[1].thumbnail}}'] // zip-align
        // profiles: ['{>> | ** | + {..author}}', 'www.domain.com/user/?name={{$}}']
    };

    const result = transform(template)(original);

    return result;
}

console.log(JSON.stringify(main()));