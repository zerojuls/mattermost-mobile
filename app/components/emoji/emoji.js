// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    PixelRatio,
    Platform,
    StyleSheet,
    Text,
} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import ImageCacheManager from 'app/utils/image_cache_manager';

export default class Emoji extends React.PureComponent {
    static propTypes = {

        /*
         * Emoji text name.
         */
        emojiName: PropTypes.string.isRequired,

        /*
         * Image URL for the emoji.
         */
        imageUrl: PropTypes.string.isRequired,

        /*
         * Set if this is a custom emoji.
         */
        isCustomEmoji: PropTypes.bool.isRequired,

        /*
         * Set to render only the text and no image.
         */
        displayTextOnly: PropTypes.bool,
        literal: PropTypes.string,
        size: PropTypes.number,
        textStyle: CustomPropTypes.Style,
    };

    static defaultProps = {
        customEmojis: new Map(),
        literal: '',
        imageUrl: '',
        isCustomEmoji: false,
    };

    constructor(props) {
        super(props);

        this.state = {
            imageUrl: null,
        };
    }

    componentWillMount() {
        const {displayTextOnly, emojiName, imageUrl} = this.props;
        this.mounted = true;
        if (!displayTextOnly && imageUrl) {
            ImageCacheManager.cache(`emoji-${emojiName}`, imageUrl, this.setImageUrl);
        }
    }

    componentWillReceiveProps(nextProps) {
        const {displayTextOnly, emojiName, imageUrl} = nextProps;
        if (emojiName !== this.props.emojiName) {
            this.setState({
                imageUrl: null,
            });
        }

        if (!displayTextOnly && imageUrl &&
                imageUrl !== this.props.imageUrl) {
            ImageCacheManager.cache(`emoji-${emojiName}`, imageUrl, this.setImageUrl);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    setImageUrl = (imageUrl) => {
        let prefix = '';
        if (Platform.OS === 'android') {
            prefix = 'file://';
        }

        const uri = `${prefix}${imageUrl}`;
        this.setState({
            imageUrl: uri,
        });
    };

    render() {
        const {
            literal,
            textStyle,
            displayTextOnly,
        } = this.props;
        const {imageUrl} = this.state;

        let size = this.props.size;
        let fontSize = size;
        if (!size && textStyle) {
            const flatten = StyleSheet.flatten(textStyle);
            fontSize = flatten.fontSize;
            size = fontSize * (Platform.OS === 'android' ? PixelRatio.get() : 1);
        }

        if (displayTextOnly) {
            return <Text style={textStyle}>{literal}</Text>;
        }

        const width = size;
        const height = size;

        let marginTop = 0;
        if (textStyle) {
            // hack to get the vertical alignment looking better
            if (fontSize > 16) {
                marginTop -= 2;
            } else if (fontSize <= 16) {
                marginTop += 1;
            }
        }

        // Android can't change the size of an image after its first render, so
        // force a new image to be rendered when the size changes
        const key = Platform.OS === 'android' ? (height + '-' + width) : null;

        if (!imageUrl) {
            return (
                <Image
                    key={key}
                    style={{width, height, marginTop}}
                />
            );
        }

        return (
            <Image
                key={key}
                style={{width, height, marginTop}}
                source={{uri: imageUrl}}
                onError={this.onError}
            />
        );
    }
}
