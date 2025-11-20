package com.future.my.web;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.future.my.service.PredictEnergyService;
import com.future.my.vo.PredictEnergyVO;

@RestController
public class PredictEnergyController {

	@Autowired
	PredictEnergyService service;

	private static final Logger log = LoggerFactory.getLogger(PredictEnergyController.class);

	@GetMapping("/api/predict-energy")
	public ResponseEntity<Map<String, Object>> getPredictEnergy(
			@RequestParam(value = "cityId", required = false) Integer cityId,
			@RequestParam(value = "countyId", required = false) Integer countyId) {

		Map<String, Object> body = new HashMap<>();

		try {
			Integer normalizedCityId = normalizeCityId(cityId);
			List<PredictEnergyVO> items = findPredictEnergy(normalizedCityId, countyId);
			body.put("items", items);
			body.put("count", items.size());
			body.put("cityId", cityId);
			body.put("normalizedCityId", normalizedCityId);
			body.put("countyId", countyId);
			body.put("errorMessage", null);
			return ResponseEntity.ok(body);
		} catch (DataAccessException ex) {
			log.error("예측 에너지 데이터를 조회하는 중 DB 오류가 발생했습니다. cityId={}, countyId={}", cityId, countyId, ex);
			body.put("items", Collections.emptyList());
			body.put("count", 0);
			body.put("cityId", cityId);
			body.put("normalizedCityId", normalizeCityId(cityId));
			body.put("countyId", countyId);
			body.put("errorMessage", "예측 에너지 데이터를 조회하는 중 DB 오류가 발생했습니다.");
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
		} catch (Exception ex) {
			log.error("예측 에너지 데이터를 조회하는 중 예상치 못한 오류가 발생했습니다. cityId={}, countyId={}", cityId, countyId, ex);
			body.put("items", Collections.emptyList());
			body.put("count", 0);
			body.put("cityId", cityId);
			body.put("normalizedCityId", normalizeCityId(cityId));
			body.put("countyId", countyId);
			body.put("errorMessage", "예측 에너지 데이터를 조회하는 중 오류가 발생했습니다.");
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
		}
	}

	private List<PredictEnergyVO> findPredictEnergy(Integer cityId, Integer countyId) {
		if (countyId != null && countyId != 0) {
			PredictEnergyVO condition = new PredictEnergyVO();
			condition.setCountyId(countyId);
			return service.getCountyPredictEnergy(condition);
		}
		if (cityId != null && cityId != 0) {
			PredictEnergyVO condition = new PredictEnergyVO();
			condition.setCityId(cityId);
			return service.getCityPredictEnergy(condition);
		}
		return service.getCountryPredictEnergy();
	}

	private Integer normalizeCityId(Integer cityId) {
		if (cityId == null) {
			return null;
		}
		if (cityId == 0) {
			return 0;
		}
		if (cityId >= 1000) {
			return cityId / 1000;
		}
		return cityId;
	}

}

