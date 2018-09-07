// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    Linking,
    Platform,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex, calculateDimensions} from 'app/utils/images';
import {getNearestPoint} from 'app/utils/opengraph';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const MAX_IMAGE_HEIGHT = 150;
const VIEWPORT_IMAGE_OFFSET = 88;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;

export default class PostAttachmentOpenGraph extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getOpenGraphMetadata: PropTypes.func.isRequired,
        }).isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        isReplyPost: PropTypes.bool,
        link: PropTypes.string.isRequired,
        navigator: PropTypes.object.isRequired,
        openGraphData: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = this.getBestImageUrl(props.openGraphData);
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentWillMount() {
        this.fetchData(this.props.link, this.props.openGraphData);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.link !== this.props.link) {
            this.setState({hasImage: false});
            this.fetchData(nextProps.link, nextProps.openGraphData);
        }

        if (this.props.openGraphData !== nextProps.openGraphData) {
            this.setState(this.getBestImageUrl(nextProps.openGraphData));
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    fetchData(url, openGraphData) {
        if (!openGraphData) {
            this.props.actions.getOpenGraphMetadata(url);
        }
    }

    getBestImageUrl(data) {
        if (!data || !data.images) {
            return {
                hasImage: false,
            };
        }

        const bestDimensions = {
            width: this.getViewPostWidth(),
            height: MAX_IMAGE_HEIGHT,
        };

        const bestImage = getNearestPoint(bestDimensions, data.images, 'width', 'height');
        const imageUrl = bestImage.secure_url || bestImage.url;
        const ogImage = data.images.find((i) => i.url === imageUrl || i.secure_url === imageUrl);

        let dimensions = bestDimensions;
        if (ogImage && ogImage.width && ogImage.height) {
            dimensions = calculateDimensions(ogImage.height, ogImage.width, this.getViewPostWidth());
        }

        if (imageUrl) {
            ImageCacheManager.cache(this.getFilename(imageUrl), imageUrl, this.getImageSize);
        }

        return {
            hasImage: true,
            ...dimensions,
            openGraphImageUrl: imageUrl,
        };
    }

    getFilename = (link) => {
        let filename = link.substring(link.lastIndexOf('/') + 1, link.indexOf('?') === -1 ? link.length : link.indexOf('?'));
        const extension = filename.split('.').pop();

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
        }

        return `og-${filename.replace(/:/g, '-')}`;
    };

    getImageSize = (imageUrl) => {
        const {openGraphData} = this.props;
        const {openGraphImageUrl} = this.state;

        let prefix = '';
        if (Platform.OS === 'android') {
            prefix = 'file://';
        }

        const uri = `${prefix}${imageUrl}`;
        const ogImage = openGraphData.images.find((i) => i.url === openGraphImageUrl || i.secure_url === openGraphImageUrl);

        if (ogImage && ogImage.width && ogImage.height) {
            this.setImageSize(uri, ogImage.width, ogImage.height);
        } else {
            Image.getSize(uri, (width, height) => {
                this.setImageSize(uri, width, height);
            }, () => null);
        }
    };

    setImageSize = (imageUrl, originalWidth, originalHeight) => {
        if (this.mounted) {
            const dimensions = calculateDimensions(originalHeight, originalWidth, this.getViewPostWidth());

            this.setState({
                imageUrl,
                originalWidth,
                originalHeight,
                ...dimensions,
            });
        }
    };

    getViewPostWidth = () => {
        const {deviceHeight, deviceWidth, isReplyPost} = this.props;
        const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
        const viewPortWidth = deviceSize - VIEWPORT_IMAGE_OFFSET - (isReplyPost ? VIEWPORT_IMAGE_REPLY_OFFSET : 0);

        return viewPortWidth;
    };

    goToLink = () => {
        Linking.openURL(this.props.link);
    };

    handlePreviewImage = () => {
        const {
            imageUrl: uri,
            openGraphImageUrl: link,
            originalWidth,
            originalHeight,
        } = this.state;
        const filename = this.getFilename(link);

        const files = [{
            caption: filename,
            dimensions: {
                width: originalWidth,
                height: originalHeight,
            },
            source: {uri},
            data: {
                localPath: uri,
            },
        }];

        previewImageAtIndex(this.props.navigator, [this.refs.item], 0, files);
    };

    render() {
        const {isReplyPost, openGraphData, theme} = this.props;
        const {hasImage, height, imageUrl, width} = this.state;

        if (!openGraphData) {
            return null;
        }

        const style = getStyleSheet(theme);

        let description = null;
        let source;
        if (imageUrl) {
            source = {
                uri: imageUrl,
            };
        }

        if (openGraphData.description) {
            description = (
                <View style={style.flex}>
                    <Text
                        style={style.siteDescription}
                        numberOfLines={5}
                        ellipsizeMode='tail'
                    >
                        {openGraphData.description}
                    </Text>
                </View>
            );
        }

        return (
            <View style={style.container}>
                <View style={style.flex}>
                    <Text
                        style={style.siteTitle}
                        numberOfLines={1}
                        ellipsizeMode='tail'
                    >
                        {openGraphData.site_name}
                    </Text>
                </View>
                <View style={style.wrapper}>
                    <TouchableOpacity
                        style={style.flex}
                        onPress={this.goToLink}
                    >
                        <Text
                            style={[style.siteSubtitle, {marginRight: isReplyPost ? 10 : 0}]}
                            numberOfLines={3}
                            ellipsizeMode='tail'
                        >
                            {openGraphData.title || openGraphData.url}
                        </Text>
                    </TouchableOpacity>
                </View>
                {description}
                {hasImage &&
                    <View
                        ref='item'
                        style={[style.imageContainer, {width, height}]}
                    >
                        <TouchableWithoutFeedback
                            onPress={this.handlePreviewImage}
                        >
                            <Image
                                ref='image'
                                style={[style.image, {width, height}]}
                                source={source}
                                resizeMode='contain'
                            />
                        </TouchableWithoutFeedback>
                    </View>
                }
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
            marginTop: 10,
            padding: 10,
        },
        flex: {
            flex: 1,
        },
        wrapper: {
            flex: 1,
            flexDirection: 'row',
        },
        siteTitle: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginBottom: 10,
        },
        siteSubtitle: {
            fontSize: 14,
            color: theme.linkColor,
            marginBottom: 10,
        },
        siteDescription: {
            fontSize: 13,
            color: changeOpacity(theme.centerChannelColor, 0.7),
            marginBottom: 10,
        },
        imageContainer: {
            alignItems: 'center',
        },
        image: {
            borderRadius: 3,
        },
    };
});
