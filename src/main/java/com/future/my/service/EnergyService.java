package com.future.my.service;

import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.future.my.dao.IEnergyDAO;
import com.future.my.vo.EnergyVO;

@Service
public class EnergyService {
	
	@Autowired
	IEnergyDAO dao;
	
	public ArrayList<EnergyVO> getCountryEnergy(){
		
		return dao.getCountryEnergy();
	};
	
	public ArrayList<EnergyVO> getCityEnergy(EnergyVO vo){
		return dao.getCityEnergy(vo);
	};
	
	public ArrayList<EnergyVO> getCountyEnergy(EnergyVO vo){
		return dao.getCountyEnergy(vo);
	};

}
