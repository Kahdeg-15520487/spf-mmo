FROM osrm/osrm-backend:latest

COPY vietnam-latest.osm.pbf /data/vietnam-latest.osm.pbf

RUN osrm-extract -p /opt/car.lua /data/vietnam-latest.osm.pbf
RUN osrm-partition /data/vietnam-latest.osrm
RUN osrm-customize /data/vietnam-latest.osrm
RUN rm /data/vietnam-latest.osm.pbf

EXPOSE 5000
ENTRYPOINT ["osrm-routed", "--algorithm", "mld", "/data/vietnam-latest.osrm"]
