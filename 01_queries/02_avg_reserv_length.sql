-- get the average length of all stays
SELECT AVG(end_date - start_date)
       AS average_duration
FROM reservations;