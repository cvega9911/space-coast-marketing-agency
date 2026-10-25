#!/usr/bin/env python3
"""Initialize pricing.db with trade pricing data."""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pricing.db')


PRICING_DATA = [
    # === ROOFING ===
    ('roofing', 'Asphalt shingle replacement', 'sq ft', 5.50, 1.4),
    ('roofing', 'Metal roof installation', 'sq ft', 12.00, 1.6),
    ('roofing', 'Tile roof repair', 'sq ft', 9.00, 1.5),
    ('roofing', 'Flat roof (TPO/EPDM)', 'sq ft', 7.50, 1.3),
    ('roofing', 'Flashing replacement', 'linear ft', 18.00, 1.2),
    ('roofing', 'Underlayment replacement', 'sq ft', 2.50, 1.1),
    ('roofing', 'Gutter replacement', 'linear ft', 12.00, 1.2),
    ('roofing', 'Skylight repair', 'per unit', 350.00, 1.5),
    ('roofing', 'Roof inspection', 'per visit', 250.00, 1.0),
    ('roofing', 'Emergency tarping', 'per visit', 500.00, 1.3),

    # === LANDSCAPING ===
    ('landscaping', 'Sod installation', 'sq ft', 2.00, 1.3),
    ('landscaping', 'Mulch installation', 'sq ft', 0.60, 1.1),
    ('landscaping', 'Tree planting (small)', 'per tree', 150.00, 1.3),
    ('landscaping', 'Tree planting (large)', 'per tree', 450.00, 1.5),
    ('landscaping', 'Shrub/bush planting', 'per shrub', 45.00, 1.2),
    ('landscaping', 'Paver patio installation', 'sq ft', 18.00, 1.6),
    ('landscaping', 'Retaining wall (block)', 'sq ft face', 35.00, 1.5),
    ('landscaping', 'Irrigation system install', 'per zone', 650.00, 1.4),
    ('landscaping', 'Gravel installation', 'sq ft', 1.50, 1.1),
    ('landscaping', 'Lawn aeration', 'per 1000 sq ft', 75.00, 1.0),

    # === PAINTING ===
    ('painting', 'Interior wall painting', 'sq ft', 3.00, 1.3),
    ('painting', 'Exterior painting', 'sq ft', 4.50, 1.4),
    ('painting', 'Ceiling painting', 'sq ft', 2.50, 1.2),
    ('painting', 'Trim/baseboard painting', 'linear ft', 2.00, 1.2),
    ('painting', 'Cabinet painting', 'per linear ft', 45.00, 1.5),
    ('painting', 'Deck/fence staining', 'sq ft', 3.50, 1.3),
    ('painting', 'Drywall repair + paint', 'sq ft', 5.00, 1.4),
    ('painting', 'Wallpaper removal', 'sq ft', 2.00, 1.2),
    ('painting', 'Popcorn ceiling removal', 'sq ft', 4.00, 1.5),
    ('painting', 'Primer application', 'sq ft', 1.50, 1.1),

    # === HVAC ===
    ('HVAC', 'AC unit replacement (3-ton)', 'per unit', 5500.00, 1.5),
    ('HVAC', 'Furnace replacement', 'per unit', 4500.00, 1.5),
    ('HVAC', 'Heat pump installation', 'per unit', 7500.00, 1.6),
    ('HVAC', 'Ductwork replacement', 'linear ft', 35.00, 1.4),
    ('HVAC', 'Thermostat upgrade', 'per unit', 250.00, 1.1),
    ('HVAC', 'AC coil cleaning', 'per unit', 350.00, 1.2),
    ('HVAC', 'Refrigerant recharge', 'per visit', 300.00, 1.2),
    ('HVAC', 'Mini-split installation', 'per zone', 3500.00, 1.5),
    ('HVAC', 'Air handler replacement', 'per unit', 2800.00, 1.4),
    ('HVAC', 'Annual maintenance', 'per visit', 180.00, 1.0),

    # === FENCING ===
    ('fencing', 'Wood privacy fence', 'linear ft', 28.00, 1.4),
    ('fencing', 'Chain link fence', 'linear ft', 15.00, 1.2),
    ('fencing', 'Vinyl fence', 'linear ft', 35.00, 1.3),
    ('fencing', 'Aluminum/iron fence', 'linear ft', 45.00, 1.5),
    ('fencing', 'Fence post replacement', 'per post', 85.00, 1.2),
    ('fencing', 'Gate installation (single)', 'per gate', 450.00, 1.3),
    ('fencing', 'Gate installation (double)', 'per gate', 750.00, 1.4),
    ('fencing', 'Fence staining/sealing', 'linear ft', 4.00, 1.2),
    ('fencing', 'Temporary fence', 'linear ft', 8.00, 1.0),
    ('fencing', 'Fence removal/disposal', 'linear ft', 6.00, 1.1),

    # === PLUMBING ===
    ('plumbing', 'Water heater replacement', 'per unit', 1800.00, 1.4),
    ('plumbing', 'Toilet replacement', 'per unit', 450.00, 1.3),
    ('plumbing', 'Sink/faucet install', 'per fixture', 350.00, 1.3),
    ('plumbing', 'Pipe repair (copper)', 'per joint', 150.00, 1.4),
    ('plumbing', 'Pipe repair (PEX)', 'linear ft', 12.00, 1.2),
    ('plumbing', 'Drain cleaning', 'per visit', 275.00, 1.1),
    ('plumbing', 'Sewer line replacement', 'linear ft', 80.00, 1.6),
    ('plumbing', 'Garbage disposal install', 'per unit', 325.00, 1.2),
    ('plumbing', 'Sump pump install', 'per unit', 1200.00, 1.4),
    ('plumbing', 'Leak detection/repair', 'per visit', 350.00, 1.3),

    # === PEST CONTROL ===
    ('pest control', 'General pest treatment (interior)', 'per sq ft', 0.25, 1.0),
    ('pest control', 'General pest treatment (exterior)', 'per sq ft', 0.20, 1.0),
    ('pest control', 'Termite treatment', 'linear ft', 12.00, 1.3),
    ('pest control', 'Bed bug heat treatment', 'per room', 500.00, 1.4),
    ('pest control', 'Rodent exclusion', 'per visit', 400.00, 1.3),
    ('pest control', 'Mosquito treatment', 'per 1000 sq ft', 65.00, 1.1),
    ('pest control', 'Wasp/hornet nest removal', 'per nest', 150.00, 1.2),
    ('pest control', 'Wildlife removal', 'per visit', 350.00, 1.3),
    ('pest control', 'Fumigation (whole house)', 'per sq ft', 2.50, 1.5),
    ('pest control', 'Quarterly maintenance plan', 'per quarter', 125.00, 1.0),

    # === REMODELING ===
    ('remodeling', 'Kitchen remodel (full)', 'per sq ft', 250.00, 2.0),
    ('remodeling', 'Bathroom remodel (full)', 'per sq ft', 200.00, 1.8),
    ('remodeling', 'Flooring installation (hardwood)', 'sq ft', 12.00, 1.5),
    ('remodeling', 'Flooring installation (tile)', 'sq ft', 15.00, 1.5),
    ('remodeling', 'Flooring installation (LVP)', 'sq ft', 7.00, 1.3),
    ('remodeling', 'Countertop installation (granite)', 'sq ft', 85.00, 1.6),
    ('remodeling', 'Countertop installation (quartz)', 'sq ft', 95.00, 1.6),
    ('remodeling', 'Cabinet installation', 'per linear ft', 400.00, 1.7),
    ('remodeling', 'Drywall installation', 'sq ft', 2.50, 1.3),
    ('remodeling', 'Window replacement', 'per window', 650.00, 1.4),
]


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS trade_pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trade TEXT NOT NULL,
            item TEXT NOT NULL,
            unit TEXT NOT NULL,
            rate REAL NOT NULL,
            labor_multiplier REAL NOT NULL DEFAULT 1.0
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS estimates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL DEFAULT '',
            trade TEXT NOT NULL,
            photo_filename TEXT DEFAULT '',
            analysis_json TEXT DEFAULT '{}',
            calculated_price REAL DEFAULT 0.0,
            breakdown_json TEXT DEFAULT '{}',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Clear and re-seed
    cur.execute('DELETE FROM trade_pricing')
    cur.executemany(
        'INSERT INTO trade_pricing (trade, item, unit, rate, labor_multiplier) VALUES (?, ?, ?, ?, ?)',
        PRICING_DATA
    )

    conn.commit()
    conn.close()
    print(f'Initialized {DB_PATH} with {len(PRICING_DATA)} pricing entries across 8 trades.')


if __name__ == '__main__':
    init_db()