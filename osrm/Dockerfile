FROM osrm/osrm-backend:latest

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -L --retry 3 -o /data/vietnam-latest.osm.pbf https://download.geofabrik.de/asia/vietnam-latest.osm.pbf && \
    osrm-extract -p /opt/car.lua /data/vietnam-latest.osm.pbf && \
    osrm-partition /data/vietnam-latest.osrm && \
    osrm-customize /data/vietnam-latest.osrm && \
    rm /data/vietnam-latest.osm.pbf && \
    chmod 644 /data/vietnam-latest.osrm* && \
    apt-get purge -y curl && apt-get autoremove -y

EXPOSE 5000
ENTRYPOINT ["osrm-routed", "--algorithm", "mld", "/data/vietnam-latest.osrm"]
