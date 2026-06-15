import { Router, Request, Response } from 'express';
import { getCommercialZones, getResidentialZones, ALL_ZONES, getZoneById } from '../zones';

export const zonesRouter = Router();

// Get all zones
zonesRouter.get('/', (_req: Request, res: Response) => {
  res.json(ALL_ZONES);
});

// Get commercial zones
zonesRouter.get('/commercial', (_req: Request, res: Response) => {
  res.json(getCommercialZones());
});

// Get residential zones
zonesRouter.get('/residential', (_req: Request, res: Response) => {
  res.json(getResidentialZones());
});

// Get a specific zone by ID
zonesRouter.get('/:id', (req: Request, res: Response) => {
  const zone = getZoneById(req.params.id);
  if (!zone) {
    res.status(404).json({ error: 'Zone not found' });
    return;
  }
  res.json(zone);
});
