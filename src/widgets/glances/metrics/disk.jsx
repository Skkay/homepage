import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useTranslation } from "next-i18next";

import Error from "../components/error";
import Container from "../components/container";
import Block from "../components/block";

import useWidgetAPI from "utils/proxy/use-widget-api";

const ChartDual = dynamic(() => import("../components/chart_dual"), { ssr: false });

const pointsLimit = 15;

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;
  const [, diskName] = widget.metric.split(':');

  const [dataPoints, setDataPoints] = useState(new Array(pointsLimit).fill({ read_bytes: 0, write_bytes: 0, time_since_update: 0 }, 0, pointsLimit));
  const [ratePoints, setRatePoints] = useState(new Array(pointsLimit).fill({ a: 0, b: 0 }, 0, pointsLimit));

  const { data, error } = useWidgetAPI(service.widget, 'diskio', {
    refreshInterval: 1000,
  });

  const calculateRates = (d) => d.map(item => ({
              a: item.read_bytes / item.time_since_update,
              b: item.write_bytes / item.time_since_update
          }));

  useEffect(() => {
    if (data) {
      const diskData = data.find((item) => item.disk_name === diskName);

      setDataPoints((prevDataPoints) => {
        const newDataPoints = [...prevDataPoints, diskData];
          if (newDataPoints.length > pointsLimit) {
              newDataPoints.shift();
          }
          return newDataPoints;
      });
    }
  }, [data, diskName]);

  useEffect(() => {
    setRatePoints(calculateRates(dataPoints));
  }, [dataPoints]);

  if (error) {
    return <Container><Error error={error} /></Container>;
  }

  if (!data) {
    return <Container><Block position="bottom-3 left-3">-</Block></Container>;
  }

  const diskData = data.find((item) => item.disk_name === diskName);

  if (!diskData) {
    return <Container><Block position="bottom-3 left-3">-</Block></Container>;
  }

  const diskRates = calculateRates(dataPoints);
  const currentRate = diskRates[diskRates.length - 1];

  return (
    <Container>
      <ChartDual
        dataPoints={ratePoints}
        label={[t("glances.read"), t("glances.write")]}
        max={diskData.critical}
        formatter={(value) => t("common.bitrate", {
          value,
          })}
      />

      {currentRate && !error && (
        <Block position="bottom-3 left-3">
          <div className="text-xs opacity-50">
            {t("common.bitrate", {
              value: currentRate.a,
            })} {t("glances.read")}
          </div>
          <div className="text-xs opacity-50">
            {t("common.bitrate", {
              value: currentRate.b,
            })} {t("glances.write")}
          </div>
        </Block>
      )}

      <Block position="bottom-3 right-3">
        <div className="text-xs opacity-75">
          {t("common.bitrate", {
            value: currentRate.a + currentRate.b,
          })}
        </div>
      </Block>
    </Container>
  );
}
