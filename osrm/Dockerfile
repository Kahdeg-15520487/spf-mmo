FROM osrm/osrm-backend:latest
COPY osrm-data/ /data/
EXPOSE 5000
ENTRYPOINT ["osrm-routed", "--algorithm", "mld", "/data/vietnam-latest.osrm"]
