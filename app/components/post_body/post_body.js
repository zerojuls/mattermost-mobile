// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    Platform,
    TouchableHighlight,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import Icon from 'react-native-vector-icons/Ionicons';

import {Posts} from 'mattermost-redux/constants';

import CombinedSystemMessage from 'app/components/combined_system_message';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import OptionsContext from 'app/components/options_context';
import ShowMoreButton from 'app/components/show_more_button';

import {emptyFunction} from 'app/utils/general';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

let FileAttachmentList;
let PostAddChannelMember;
let PostBodyAdditionalContent;
let Reactions;

export default class PostBody extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            flagPost: PropTypes.func.isRequired,
            unflagPost: PropTypes.func.isRequired,
        }).isRequired,
        canAddReaction: PropTypes.bool,
        canDelete: PropTypes.bool,
        canEdit: PropTypes.bool,
        canEditUntil: PropTypes.number.isRequired,
        channelIsReadOnly: PropTypes.bool.isRequired,
        fileIds: PropTypes.array,
        hasBeenDeleted: PropTypes.bool,
        hasBeenEdited: PropTypes.bool,
        hasReactions: PropTypes.bool,
        highlight: PropTypes.bool,
        imageDimensions: PropTypes.array,
        isFailed: PropTypes.bool,
        isFlagged: PropTypes.bool,
        isPending: PropTypes.bool,
        isPostAddChannelMember: PropTypes.bool,
        isPostEphemeral: PropTypes.bool,
        isReplyPost: PropTypes.bool,
        isSearchResult: PropTypes.bool,
        isSystemMessage: PropTypes.bool,
        managedConfig: PropTypes.object,
        message: PropTypes.string,
        navigator: PropTypes.object.isRequired,
        onAddReaction: PropTypes.func,
        onCopyPermalink: PropTypes.func,
        onCopyText: PropTypes.func,
        onFailedPostPress: PropTypes.func,
        onPermalinkPress: PropTypes.func,
        onPostDelete: PropTypes.func,
        onPostEdit: PropTypes.func,
        onPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        postProps: PropTypes.object,
        postType: PropTypes.string,
        replyBarStyle: PropTypes.array,
        showAddReaction: PropTypes.bool,
        showLongPost: PropTypes.bool.isRequired,
        theme: PropTypes.object,
        toggleSelected: PropTypes.func,
    };

    static defaultProps = {
        fileIds: [],
        imageDimensions: [],
        onAddReaction: emptyFunction,
        onCopyPermalink: emptyFunction,
        onCopyText: emptyFunction,
        onFailedPostPress: emptyFunction,
        onPostDelete: emptyFunction,
        onPostEdit: emptyFunction,
        onPress: emptyFunction,
        replyBarStyle: [],
        toggleSelected: emptyFunction,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    state = {
        isLongPost: false,
    };

    flagPost = () => {
        const {actions, postId} = this.props;
        actions.flagPost(postId);
    };

    handleHideUnderlay = () => {
        this.props.toggleSelected(false);
    };

    handleShowUnderlay = () => {
        this.props.toggleSelected(true);
    };

    hideOptionsContext = () => {
        if (Platform.OS === 'ios' && this.refs.options) {
            this.refs.options.hide();
        }
    };

    getPostActions = () => {
        const {formatMessage} = this.context.intl;
        const {
            canEdit,
            canEditUntil,
            canDelete,
            canAddReaction,
            channelIsReadOnly,
            hasBeenDeleted,
            isPending,
            isFailed,
            isFlagged,
            isPostEphemeral,
            isSystemMessage,
            managedConfig,
            onCopyText,
            onPostDelete,
            onPostEdit,
            showAddReaction,
        } = this.props;
        const actions = [];
        const isPendingOrFailedPost = isPending || isFailed;

        // we should check for the user roles and permissions
        if (!isPendingOrFailedPost && !isSystemMessage && !isPostEphemeral) {
            if (showAddReaction && canAddReaction && !channelIsReadOnly) {
                actions.push({
                    text: formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'}),
                    onPress: this.props.onAddReaction,
                });
            }

            if (managedConfig.copyAndPasteProtection !== 'true') {
                actions.push({
                    text: formatMessage({id: 'mobile.post_info.copy_post', defaultMessage: 'Copy Post'}),
                    onPress: onCopyText,
                    copyPost: true,
                });
            }

            if (!channelIsReadOnly) {
                if (isFlagged) {
                    actions.push({
                        text: formatMessage({id: 'post_info.mobile.unflag', defaultMessage: 'Unflag'}),
                        onPress: this.unflagPost,
                    });
                } else {
                    actions.push({
                        text: formatMessage({id: 'post_info.mobile.flag', defaultMessage: 'Flag'}),
                        onPress: this.flagPost,
                    });
                }
            }

            if (canEdit && (canEditUntil === -1 || canEditUntil > Date.now())) {
                actions.push({text: formatMessage({id: 'post_info.edit', defaultMessage: 'Edit'}), onPress: onPostEdit});
            }

            actions.push({
                text: formatMessage({id: 'get_post_link_modal.title', defaultMessage: 'Copy Permalink'}),
                onPress: this.props.onCopyPermalink,
            });
        }

        if (!isPendingOrFailedPost && !isPostEphemeral && canDelete && !hasBeenDeleted) {
            actions.push({text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}), onPress: onPostDelete});
        }

        return actions;
    };

    measurePost = (event) => {
        const {height} = event.nativeEvent.layout;
        const {height: deviceHeight} = Dimensions.get('window');
        const {showLongPost} = this.props;

        if (!showLongPost && height >= (deviceHeight * 1.2)) {
            this.setState({
                isLongPost: true,
                maxHeight: (deviceHeight * 0.6),
            });
        }
    };

    openLongPost = preventDoubleTap(() => {
        const {managedConfig, navigator, onAddReaction, onPermalinkPress, postId} = this.props;
        const options = {
            screen: 'LongPost',
            animationType: 'none',
            backButtonTitle: '',
            overrideBackPress: true,
            navigatorStyle: {
                navBarHidden: true,
                screenBackgroundColor: changeOpacity('#000', 0.2),
                modalPresentationStyle: 'overCurrentContext',
            },
            passProps: {
                postId,
                managedConfig,
                onAddReaction,
                onPermalinkPress,
            },
        };

        navigator.showModal(options);
    });

    unflagPost = () => {
        const {actions, postId} = this.props;
        actions.unflagPost(postId);
    };

    showOptionsContext = (additionalAction) => {
        if (this.refs.options) {
            this.refs.options.show(additionalAction);
        }
    };

    renderAddChannelMember = (style, messageStyle, textStyles) => {
        const {onPermalinkPress, onPress, postProps} = this.props;

        if (!PostAddChannelMember) {
            PostAddChannelMember = require('app/components/post_add_channel_member').default;
        }

        return (
            <View style={style.row}>
                <View style={style.flex}>
                    <PostAddChannelMember
                        baseTextStyle={messageStyle}
                        navigator={navigator}
                        onLongPress={this.showOptionsContext}
                        onPermalinkPress={onPermalinkPress}
                        onPostPress={onPress}
                        textStyles={textStyles}
                        postId={postProps.add_channel_member.post_id}
                        userIds={postProps.add_channel_member.user_ids}
                        usernames={postProps.add_channel_member.usernames}
                    />
                </View>
            </View>
        );
    };

    renderFileAttachments() {
        const {
            fileIds,
            isFailed,
            navigator,
            postId,
            showLongPost,
            toggleSelected,
        } = this.props;

        if (showLongPost) {
            return null;
        }

        let attachments;
        if (fileIds.length > 0) {
            if (!FileAttachmentList) {
                FileAttachmentList = require('app/components/file_attachment_list').default;
            }

            attachments = (
                <FileAttachmentList
                    fileIds={fileIds}
                    hideOptionsContext={this.hideOptionsContext}
                    isFailed={isFailed}
                    onLongPress={this.showOptionsContext}
                    postId={postId}
                    toggleSelected={toggleSelected}
                    navigator={navigator}
                />
            );
        }
        return attachments;
    }

    renderPostAdditionalContent = (blockStyles, messageStyle, textStyles) => {
        const {imageDimensions, isReplyPost, message, navigator, onPermalinkPress, postId, postProps} = this.props;

        if (!PostBodyAdditionalContent) {
            PostBodyAdditionalContent = require('app/components/post_body_additional_content').default;
        }

        return (
            <PostBodyAdditionalContent
                baseTextStyle={messageStyle}
                blockStyles={blockStyles}
                imageDimensions={imageDimensions}
                navigator={navigator}
                message={message}
                postId={postId}
                postProps={postProps}
                textStyles={textStyles}
                onLongPress={this.showOptionsContext}
                isReplyPost={isReplyPost}
                onPermalinkPress={onPermalinkPress}
            />
        );
    };

    renderReactions = () => {
        const {hasReactions, isSearchResult, postId, onAddReaction, showLongPost} = this.props;

        if (!hasReactions || isSearchResult || showLongPost) {
            return null;
        }

        if (!Reactions) {
            Reactions = require('app/components/reactions').default;
        }

        return (
            <Reactions
                postId={postId}
                onAddReaction={onAddReaction}
            />
        );
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {
            hasBeenDeleted,
            hasBeenEdited,
            highlight,
            imageDimensions,
            isFailed,
            isPending,
            isPostAddChannelMember,
            isReplyPost,
            isSearchResult,
            isSystemMessage,
            message,
            navigator,
            onFailedPostPress,
            onPermalinkPress,
            onPress,
            postProps,
            postType,
            replyBarStyle,
            theme,
            toggleSelected,
        } = this.props;
        const {isLongPost, maxHeight} = this.state;
        const style = getStyleSheet(theme);
        const blockStyles = getMarkdownBlockStyles(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const messageStyle = isSystemMessage ? [style.message, style.systemMessage] : style.message;
        const isPendingOrFailedPost = isPending || isFailed;

        let body;
        let messageComponent;
        if (hasBeenDeleted) {
            messageComponent = (
                <TouchableHighlight
                    onHideUnderlay={this.handleHideUnderlay}
                    onPress={onPress}
                    onShowUnderlay={this.handleShowUnderlay}
                    underlayColor='transparent'
                >
                    <View style={style.row}>
                        <FormattedText
                            style={messageStyle}
                            id='post_body.deleted'
                            defaultMessage='(message deleted)'
                        />
                    </View>
                </TouchableHighlight>
            );
            body = (<View>{messageComponent}</View>);
        } else if (isPostAddChannelMember) {
            messageComponent = this.renderAddChannelMember(style, messageStyle, textStyles);
        } else if (postType === Posts.POST_TYPES.COMBINED_USER_ACTIVITY) {
            const {allUserIds, allUsernames, messageData} = postProps.user_activity;
            messageComponent = (
                <TouchableOpacity onLongPress={this.showOptionsContext}>
                    <View style={style.row}>
                        <View style={style.flex}>
                            <CombinedSystemMessage
                                allUserIds={allUserIds}
                                allUsernames={allUsernames}
                                linkStyle={textStyles.link}
                                messageData={messageData}
                                navigator={navigator}
                                textStyles={textStyles}
                                theme={theme}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            );
        } else if (message.length) {
            messageComponent = (
                <View style={style.row}>
                    <View
                        style={[style.flex, (isPendingOrFailedPost && style.pendingPost), (isLongPost && {maxHeight, overflow: 'hidden'})]}
                        removeClippedSubviews={isLongPost}
                    >
                        <Markdown
                            baseTextStyle={messageStyle}
                            blockStyles={blockStyles}
                            imageDimensions={imageDimensions}
                            isEdited={hasBeenEdited}
                            isReplyPost={isReplyPost}
                            isSearchResult={isSearchResult}
                            navigator={navigator}
                            onLongPress={this.showOptionsContext}
                            onPermalinkPress={onPermalinkPress}
                            onPostPress={onPress}
                            textStyles={textStyles}
                            value={message}
                        />
                    </View>
                </View>
            );
        }

        if (!hasBeenDeleted) {
            body = (
                <View style={style.messageBody}>
                    <OptionsContext
                        getPostActions={this.getPostActions}
                        ref='options'
                        onPress={onPress}
                        toggleSelected={toggleSelected}
                        cancelText={formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'})}
                    >
                        <View onLayout={this.measurePost}>
                            {messageComponent}
                            {isLongPost &&
                            <ShowMoreButton
                                highlight={highlight}
                                onPress={this.openLongPost}
                            />
                            }
                        </View>
                        {this.renderPostAdditionalContent(blockStyles, messageStyle, textStyles)}
                        {this.renderFileAttachments()}
                        {this.renderReactions()}
                    </OptionsContext>
                </View>
            );
        }

        return (
            <View style={style.messageContainerWithReplyBar}>
                <View style={replyBarStyle}/>
                <View style={[style.flex, style.row]}>
                    <View style={style.flex}>
                        {body}
                    </View>
                    {isFailed &&
                        <TouchableOpacity
                            onPress={onFailedPostPress}
                            style={style.retry}
                        >
                            <Icon
                                name='ios-information-circle-outline'
                                size={26}
                                color={theme.errorTextColor}
                            />
                        </TouchableOpacity>
                    }
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        row: {
            flexDirection: 'row',
        },
        messageBody: {
            paddingBottom: 2,
            paddingTop: 2,
        },
        retry: {
            justifyContent: 'center',
            marginLeft: 12,
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            flex: 1,
        },
        pendingPost: {
            opacity: 0.5,
        },
        systemMessage: {
            opacity: 0.6,
        },
    };
});
