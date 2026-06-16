FROM osrm/osrm-backend:latest

RUN apt-get update && apt-get install -y curl && \
    curl -L -o /data/vietnam-latest.osm.pbf https://download.geofabrik.de/asia/vietnam-latest.osm.pbf && \
    osrm-extract -p /opt/car.lua /data/vietnam-latest.osm.pbf && \
    osrm-partition /data/vietnam-latest.osm.pbf && \
    osrm-customize /data/vietnam-latest.osm.pbf && \
    rm /data/vietnam-latest.osm.pbf

EXPOSE 5000
ENTRYPOINT ["osrm-routed", "--algorithm", "mld", "/data/vietnam-latest.osrm"]
