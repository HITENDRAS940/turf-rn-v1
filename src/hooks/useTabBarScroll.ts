import { useRef, useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

/**
 * Hook to hide/show the bottom tab bar based on scroll direction.
 * 
 * @param options Configuration options
 * @param options.isRootTab Set to true if the screen is a direct child of the Tab Navigator. Default is false (for nested Stack screens).
 * @returns An object containing the `onScroll` handler to be passed to a ScrollView/FlatList.
 */
export const useTabBarScroll = (navigation: any, options: { isRootTab?: boolean } = {}) => {
    const offset = useRef(0);
    const isTabBarVisible = useRef(true);

    // Threshold to prevent jittering on small scrolls
    const SCROLL_THRESHOLD = 20;

    const setTabBarVisible = (visible: boolean) => {
        const style = visible ? undefined : { display: 'none' };

        if (options.isRootTab) {
            navigation.setOptions({
                tabBarStyle: style,
            });
        } else {
            navigation.getParent()?.setOptions({
                tabBarStyle: style,
            });
        }
    };

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        const diff = currentOffset - offset.current;

        // console.log('Scroll:', { currentOffset, diff, isVisible: isTabBarVisible.current, isRootTab: options.isRootTab });

        // Ignore bounces (iOS)
        if (currentOffset <= 0) {
            if (!isTabBarVisible.current) {
                setTabBarVisible(true);
                isTabBarVisible.current = true;
            }
            offset.current = currentOffset;
            return;
        }

        // Scroll Down -> Hide Tab Bar
        if (diff > SCROLL_THRESHOLD && isTabBarVisible.current) {
            setTabBarVisible(false);
            isTabBarVisible.current = false;
        }
        // Scroll Up -> Show Tab Bar
        else if (diff < -SCROLL_THRESHOLD && !isTabBarVisible.current) {
            setTabBarVisible(true);
            isTabBarVisible.current = true;
        }

        offset.current = currentOffset;
    }, [navigation]);

    return { onScroll };
};
