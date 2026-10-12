import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Svg, { Path, Line } from "react-native-svg";

type CrowdLevel = "low" | "medium" | "high" | "very-high";

type Props = {
  locationName: string;
  crowdLevel: CrowdLevel;
  smokeyImage?: any;
};

export default function CrowdMeterCard({ locationName, crowdLevel, smokeyImage }: Props) {
  function getNeedleAngle() {
    if (crowdLevel === "low") return -130;
    if (crowdLevel === "medium") return -60;
    if (crowdLevel === "high") return 10;
    return 60;
  }

  function getCrowdText() {
    if (crowdLevel === "low") return "Low Crowd";
    if (crowdLevel === "medium") return "Moderate Crowd";
    if (crowdLevel === "high") return "Busy";
    return "Very Busy";
  }

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const radians = (angle - 90) * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(radians),
      y: cy + r * Math.sin(radians),
    };
  }

  function describeArc(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  const centerX = 110;
  const centerY = 110;
  const radius = 80;

  const segments = [
    { start: -140, end: -84, color: "#2fbf2f" },
    { start: -84, end: -28, color: "#9acd32" },
    { start: -28, end: 28, color: "#f0e130" },
    { start: 28, end: 84, color: "#ffb300" },
    { start: 84, end: 140, color: "#e53935" },
  ];

  const needleAngle = getNeedleAngle();
  const needleEnd = polarToCartesian(centerX, centerY, 58, needleAngle);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{locationName}</Text>

      <View style={styles.contentRow}>
        <View style={styles.imageBox}>
          {smokeyImage ? (
            <Image source={smokeyImage} style={styles.smokey} resizeMode="contain" />
          ) : (
            <Text style={styles.placeholderText}>Add Smokey image</Text>
          )}
        </View>

        <View style={styles.meterBox}>
          <Svg width={220} height={140}>
            {segments.map((segment, index) => (
              <Path
                key={index}
                d={describeArc(centerX, centerY, radius, segment.start, segment.end)}
                stroke={segment.color}
                strokeWidth={24}
                fill="none"
                strokeLinecap="butt"
              />
            ))}

            <Line
              x1={centerX}
              y1={centerY}
              x2={needleEnd.x}
              y2={needleEnd.y}
              stroke="black"
              strokeWidth={4}
            />
          </Svg>

          <Text style={styles.crowdText}>{getCrowdText()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageBox: {
    width: 120,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  smokey: {
    width: 110,
    height: 130,
  },
  placeholderText: {
    textAlign: "center",
    color: "gray",
  },
  meterBox: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  crowdText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
});