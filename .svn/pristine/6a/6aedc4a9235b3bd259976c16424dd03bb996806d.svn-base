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
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import com.future.my.service.EnergyService;
import com.future.my.vo.EnergyVO;

@Controller
public class EnergyController {

	@Autowired
	EnergyService service;

	private static final Logger log = LoggerFactory.getLogger(EnergyController.class);
	
	@GetMapping("/energy")
    public String index(@RequestParam(value = "cityId", required = false) Integer cityId,
                        @RequestParam(value = "countyId", required = false) Integer countyId,
                        Model model) {

        List<EnergyVO> energyList = Collections.emptyList();
        String errorMessage = null;

        try {
            energyList = findEnergy(cityId, countyId);
        } catch (DataAccessException ex) {
            log.error("데이터베이스 조회 중 오류가 발생했습니다. cityId={}, countyId={}", cityId, countyId, ex);
            errorMessage = "데이터베이스에서 에너지 데이터를 조회하는 중 오류가 발생했습니다.";
        } catch (Exception ex) {
            log.error("에너지 데이터를 조회하는 중 예상치 못한 오류가 발생했습니다. cityId={}, countyId={}", cityId,
                    countyId, ex);
            errorMessage = "에너지 데이터를 조회하는 중 오류가 발생했습니다.";
        }

        model.addAttribute("energyList", energyList);
        model.addAttribute("selectedCityId", cityId);
        model.addAttribute("selectedCountyId", countyId);
        model.addAttribute("errorMessage", errorMessage);

        return "energy/list";
    }

    @GetMapping("/api/energy")
    @ResponseBody
    @CrossOrigin
    public ResponseEntity<Map<String, Object>> energyApi(
            @RequestParam(value = "cityId", required=false) Integer cityId,
            @RequestParam(value = "countyId", required=false) Integer countyId) {

        Map<String, Object> body = new HashMap<>();

        try {
            List<EnergyVO> energyList = findEnergy(cityId, countyId);
            body.put("items", energyList);
            body.put("count", energyList.size());
            body.put("cityId", cityId);
            body.put("countyId", countyId);
            body.put("errorMessage", null);
            return ResponseEntity.ok(body);
        } catch (DataAccessException ex) {
            log.error("API를 통한 에너지 데이터 조회 중 DB 오류가 발생했습니다. cityId={}, countyId={}", cityId, countyId, ex);
            body.put("items", Collections.emptyList());
            body.put("count", 0);
            body.put("cityId", cityId);
            body.put("countyId", countyId);
            body.put("errorMessage", "데이터베이스에서 에너지 데이터를 조회하는 중 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        } catch (Exception ex) {
            log.error("API를 통한 에너지 데이터 조회 중 예상치 못한 오류가 발생했습니다. cityId={}, countyId={}", cityId,
                    countyId, ex);
            body.put("items", Collections.emptyList());
            body.put("count", 0);
            body.put("cityId", cityId);
            body.put("countyId", countyId);
            body.put("errorMessage", "에너지 데이터를 조회하는 중 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
    }

    private List<EnergyVO> findEnergy(Integer cityId, Integer countyId) {
//        System.out.println("cityId:"+cityId+", countyId"+countyId);
    	if (countyId != null && countyId != 0) {
//        	System.out.println("countyId 분기");
            EnergyVO condition = new EnergyVO();
            condition.setCountyId(countyId);
            return service.getCountyEnergy(condition);
        }
        if (cityId != null && cityId != 0) {
//        	System.out.println("cityId 분기");
            EnergyVO condition = new EnergyVO();
            condition.setCityId(cityId);
            return service.getCityEnergy(condition);
        }
//        System.out.println("--------------");
        return service.getCountryEnergy();
    }


}
