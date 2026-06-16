FROM osrm/osrm-backend:latest

ADD https://download.geofabrik.de/asia/vietnam-latest.osm.pbf /data/vietnam-latest.osm.pbf

RUN osrm-extract -p /opt/car.lua /data/vietnam-latest.osm.pbf && \
    osrm-partition /data/vietnam-latest.osrm && \
    osrm-customize /data/vietnam-latest.osrm && \
    rm /data/vietnam-latest.osm.pbf && \
    chmod 644 /data/vietnam-latest.osrm*

EXPOSE 5000
ENTRYPOINT ["osrm-routed", "--algorithm", "mld", "/data/vietnam-latest.osrm"]
