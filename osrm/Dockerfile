FROM osrm/osrm-backend:latest

# Copy pre-processed Vietnam OSM data (built by GitHub Actions)
COPY osrm-data/*.osrm* /data/

EXPOSE 5000

ENTRYPOINT ["osrm-routed", "--algorithm", "mld", "/data/vietnam-latest.osrm"]
