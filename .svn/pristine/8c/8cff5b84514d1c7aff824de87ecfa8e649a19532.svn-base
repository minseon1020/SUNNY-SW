package com.future.my.service;

import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.future.my.dao.IPredictEnergyDAO;
import com.future.my.vo.PredictEnergyVO;

@Service
public class PredictEnergyService {

	@Autowired
	IPredictEnergyDAO dao;

	public ArrayList<PredictEnergyVO> getCountryPredictEnergy() {
		return dao.getCountryPredictEnergy();
	}

	public ArrayList<PredictEnergyVO> getCityPredictEnergy(PredictEnergyVO vo) {
		return dao.getCityPredictEnergy(vo);
	}

	public ArrayList<PredictEnergyVO> getCountyPredictEnergy(PredictEnergyVO vo) {
		return dao.getCountyPredictEnergy(vo);
	}

}

