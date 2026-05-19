import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface LaserPointerOverlayProps {
  type: 'dot' | 'trail_red' | 'trail_highlight';
}

export function LaserPointerOverlay({ type }: LaserPointerOverlayProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const pointsRef = useRef<Point[]>([]);

  useEffect(() => {
    // 30 FPS tick to fade out old points
    const interval = setInterval(() => {
      const now = Date.now();
      const validPoints = pointsRef.current.filter(p => now - p.timestamp < 1000); // 1 second tail
      if (validPoints.length !== pointsRef.current.length) {
        pointsRef.current = validPoints;
        setPoints([...validPoints]);
      }
    }, 33);
    return () => clearInterval(interval);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        pointsRef.current = [{ x: locationX, y: locationY, timestamp: Date.now() }];
        setPoints([...pointsRef.current]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        pointsRef.current.push({ x: locationX, y: locationY, timestamp: Date.now() });
        setPoints([...pointsRef.current]);
      },
      onPanResponderRelease: () => {},
      onPanResponderTerminate: () => {}
    })
  ).current;

  const generatePath = () => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i-1].x + points[i].x) / 2;
      const yc = (points[i-1].y + points[i].y) / 2;
      d += ` Q ${points[i-1].x} ${points[i-1].y}, ${xc} ${yc}`;
    }
    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  };

  const pathD = generatePath();
  const currentPoint = points.length > 0 ? points[points.length - 1] : null;
  const isDotOnly = type === 'dot';
  const strokeColor = type === 'trail_highlight' ? 'rgba(250, 204, 21, 0.4)' : 'rgba(239, 68, 68, 0.6)';
  const strokeWidth = type === 'trail_highlight' ? 24 : 6;
  const dotColor = type === 'trail_highlight' ? 'rgba(250, 204, 21, 0.8)' : 'rgba(239, 68, 68, 1)';
  const dotRadius = type === 'trail_highlight' ? 12 : 8;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} {...panResponder.panHandlers}>
      <Svg style={{ flex: 1 }}>
        {!isDotOnly && pathD ? (
          <Path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {currentPoint && (
          <Circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r={dotRadius}
            fill={dotColor}
          />
        )}
      </Svg>
    </View>
  );
}
