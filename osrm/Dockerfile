FROM osrm/osrm-backend:latest

RUN sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i '/stretch-updates/d' /etc/apt/sources.list && \
    apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -L --retry 3 -o /data/vietnam-latest.osm.pbf https://download.geofabrik.de/asia/vietnam-latest.osm.pbf && \
    osrm-extract -p /opt/car.lua /data/vietnam-latest.osm.pbf && \
    osrm-partition /data/vietnam-latest.osrm && \
    osrm-customize /data/vietnam-latest.osrm && \
    rm /data/vietnam-latest.osm.pbf && \
    chmod 644 /data/vietnam-latest.osrm*

EXPOSE 5000
ENTRYPOINT ["osrm-routed", "--algorithm", "mld", "/data/vietnam-latest.osrm"]
