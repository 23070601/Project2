-- Seed Demo Data for VNUIS Assets (Trinh Van Bo Campus)
INSERT INTO assets (asset_code, asset_name, location, status) VALUES
('VNUIS-TVB-LAB01', 'Dàn máy tính Lab 4 - Phòng 408', 'Cơ sở Trịnh Văn Bô', 'Active'),
('VNUIS-TVB-PROJ02', 'Máy chiếu - Phòng 512', 'Cơ sở Trịnh Văn Bô', 'Active'),
('VNUIS-TVB-AC03', 'Điều hòa âm trần - Phòng 101', 'Cơ sở Trịnh Văn Bô', 'Maintenance'),
('VNUIS-TVB-CAM01', 'Hệ thống Camera giám sát sảnh Tầng 1', 'Cơ sở Trịnh Văn Bô', 'Active')
ON CONFLICT DO NOTHING;
